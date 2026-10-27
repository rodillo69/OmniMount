'use strict';
const fs = require('node:fs');
const net = require('node:net');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { dirs, rcloneExe, mountCacheDir } = require('./paths');
const log = require('./logger').scoped('rclone');

// All mounts use the same remote name because each one runs in its own
// process with its own environment.
const REMOTE = 'OMNIMOUNT';

/* ----------------------------------------------------------------- config */

// An empty config file keeps rclone from touching a user-level rclone.conf or
// prompting for a config password; every setting arrives through the
// environment instead.
function emptyConfigPath() {
  const file = path.join(dirs.bin, 'rclone-empty.conf');
  try {
    if (!fs.existsSync(file)) fs.writeFileSync(file, '', 'utf8');
  } catch (err) {
    log.warn('No se pudo crear el config vacio de rclone:', err.message);
  }
  return file;
}

/**
 * Obscure a password the way rclone stores them.
 *
 * rclone rejects a plain-text password in `pass`-type fields: it expects its
 * own reversible obscuring. The value is piped through `rclone obscure -` on
 * stdin rather than passed as an argument, because a command line is readable
 * by any process on the machine while a pipe is not. The algorithm is not
 * reimplemented here on purpose: it is rclone's, and it should stay rclone's.
 */
function obscure(value) {
  return new Promise((resolve, reject) => {
    if (!value) return resolve('');

    const child = execFile(
      rcloneExe,
      ['obscure', '-'],
      { windowsHide: true },
      (err, stdout, stderr) => {
        if (err) return reject(new Error(`rclone obscure failed: ${stderr || err.message}`));
        resolve(String(stdout).trim());
      }
    );
    child.stdin.end(String(value), 'utf8');
  });
}

/**
 * Build the environment that defines the remote for a single rclone run.
 *
 * Credentials go in the environment, never in argv: a process command line is
 * readable by other processes on the machine (WMI, Get-Process), an
 * environment block is not.
 *
 * The remote is defined entirely by RCLONE_CONFIG_<NAME>_* variables, so
 * nothing is ever written to an rclone config file on disk. Field names come
 * straight from the backend catalogue, which reads them from rclone itself,
 * so any backend rclone supports can be described here without this function
 * knowing anything about it.
 */
async function buildEnv(connection, extra = {}) {
  const env = {
    ...process.env,
    [`RCLONE_CONFIG_${REMOTE}_TYPE`]: connection.type || 's3',
    RCLONE_CONFIG: emptyConfigPath(),
  };

  const config = connection.config || {};
  const secretFields = new Set(connection.obscuredFields || []);

  for (const [key, value] of Object.entries(config)) {
    if (value === undefined || value === null || value === '') continue;
    const name = `RCLONE_CONFIG_${REMOTE}_${key.toUpperCase()}`;
    // Password-type fields must be stored obscured or rclone refuses them.
    env[name] = secretFields.has(key) ? await obscure(value) : String(value);
  }

  return { ...env, ...extra };
}

/**
 * The remote path to mount.
 *
 * `root` is whatever the backend calls its top level: a bucket for S3, a
 * container for Swift, a share for SMB, a folder for SFTP and FTP. Backends
 * with no container at all leave it empty and mount from the server root.
 */
function remotePath(mount) {
  const parts = [mount.root || mount.bucket, mount.prefix].filter(Boolean).join('/');
  return `${REMOTE}:${parts}`;
}

/* ------------------------------------------------------------------ ports */

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/* ------------------------------------------------------------- mount args */

/**
 * Cache flags, from a plan worked out against the disk the cache sits on.
 *
 * `--vfs-cache-min-free-space` is the one that matters. A fixed ceiling is
 * the wrong shape for a cache: whatever number is right for this disk today
 * is wrong once it fills up, and wrong again on the next machine. Told to
 * keep an amount of the disk free, rclone evicts least-recently-used files
 * to maintain it — so the cache uses what is spare and retreats when the
 * disk is needed, without anyone picking a figure.
 *
 * A ceiling is still applied when the user asked for one.
 */
// What to use if no plan is supplied. The caller always builds one; this only
// keeps a programming slip from silently handing rclone its own defaults,
// which evict after an hour and read one chunk at a time.
const FALLBACK_TUNING = require('./cache-profiles').BALANCED;

/**
 * Cache and read-path flags, all of them from the active profile.
 *
 * None of this is per-drive: the cache sits on one disk that every drive
 * shares, and the link to the remote is the same link. A profile per drive
 * would mean one drive's read-ahead deciding how much room the other one has.
 */
function tuningFlags(mount, plan) {
  const tuning = (plan && plan.tuning) || FALLBACK_TUNING;
  const flags = [];

  // How far ahead to read, and how. With streams above zero rclone reads that
  // many chunks at once at a constant size; at zero it reads one and doubles
  // as it goes. Chunks are not held in memory.
  if (tuning.readChunkStreams > 0) {
    flags.push('--vfs-read-chunk-streams', String(tuning.readChunkStreams));
  }
  flags.push('--vfs-read-chunk-size', `${tuning.readChunkSizeMB}M`);

  // Read-ahead only exists in `full` mode, where it is buffered on disk.
  // `--buffer-size` is left at its default on purpose: rclone's own advice is
  // to grow this instead, because the buffer is per open file and in memory.
  if (tuning.cacheMode === 'full' && tuning.readAheadMB > 0) {
    flags.push('--vfs-read-ahead', `${tuning.readAheadMB}M`);
  }

  if (tuning.fastFingerprint) flags.push('--vfs-fast-fingerprint');

  flags.push(
    '--vfs-handle-caching',
    `${tuning.handleCachingSeconds}s`,
    '--dir-cache-time',
    `${tuning.dirCacheSeconds}s`,
    // S3 cannot notify about remote changes, so polling only burns requests.
    '--poll-interval',
    '0',
    '--transfers',
    String(tuning.transfers),
    '--checkers',
    String(tuning.checkers)
  );

  return flags;
}

function cacheModeFlags(mount, plan) {
  const tuning = (plan && plan.tuning) || FALLBACK_TUNING;
  const flags = ['--vfs-cache-mode', tuning.cacheMode];
  if (tuning.cacheMode !== 'writes' && tuning.cacheMode !== 'full') return flags;

  // How long a file survives after its last use. `off` does not disable the
  // cache: it removes the age limit, leaving eviction to the free-space
  // reserve below. rclone parses it as a duration of ~292 years, so the
  // cleaner's cutoff lands in the 1700s and nothing is ever too old.
  const hours = plan ? plan.retentionHours : FALLBACK_TUNING.retentionDays * 24;
  flags.push('--vfs-cache-max-age', hours > 0 ? `${hours}h` : 'off');
  flags.push('--vfs-write-back', `${tuning.writeBackSeconds}s`);

  if (plan && plan.minFreeSpaceGB > 0) {
    flags.push('--vfs-cache-min-free-space', `${plan.minFreeSpaceGB}G`);
  }

  const ceiling = plan ? plan.maxSizeGB : 0;
  if (ceiling > 0) flags.push('--vfs-cache-max-size', `${ceiling}G`);

  // Per-mount cache directory: the remote name is shared, so without this
  // two mounts of different buckets would write into the same cache tree.
  flags.push('--cache-dir', (plan && plan.dir) || mountCacheDir(mount.id));

  return flags;
}

function splitFlags(text) {
  // Split on whitespace but honour quoted values, so a flag like
  // --header "X-Foo: bar" survives.
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;
  while ((match = re.exec(text || '')) !== null) {
    out.push(match[1] ?? match[2] ?? match[3]);
  }
  return out;
}

/**
 * Etiqueta del volumen. Montada como unidad de red, Windows muestra la ruta
 * UNC, así que hay que darle esa forma: de lo contrario rclone cae en
 * "\\server\<bucket>" y en el Explorador aparece un "server" genérico.
 */
function volumeName(mount) {
  const label = (mount.volumeLabel || mount.name || mount.bucket || 'Drive')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .trim()
    .slice(0, 32);
  return mount.networkMode ? `\\\\OmniMount\\${label || 'Remote'}` : label;
}

function buildMountArgs(mount, rc, options = {}) {
  const { cache: cachePlan = null, globalExtraFlags = '' } = options;
  const args = [
    'mount',
    remotePath(mount),
    `${mount.driveLetter}:`,
    '--volname',
    volumeName(mount),
  ];

  if (mount.networkMode) args.push('--network-mode');
  if (mount.readOnly) args.push('--read-only');

  // Sin esto rclone declara 1 PB y el Explorador muestra "1024 TB libres".
  if (mount.reportedSizeTB > 0) {
    args.push('--vfs-disk-space-total-size', `${mount.reportedSizeTB}T`);
  }

  args.push(...cacheModeFlags(mount, cachePlan));
  args.push(...tuningFlags(mount, cachePlan));

  if (mount.bandwidthLimit) args.push('--bwlimit', mount.bandwidthLimit);

  // Remote control, bound to loopback and protected by per-session credentials
  // so another local process cannot drive or unmount the drive.
  args.push(
    '--rc',
    '--rc-addr',
    `127.0.0.1:${rc.port}`,
    '--rc-user',
    rc.user,
    '--rc-pass',
    rc.pass
  );

  args.push(
    '--log-level',
    'INFO',
    // Stats are read over the rc API; printing them would only flood the log.
    '--stats',
    '0',
    '--no-console'
  );

  args.push(...splitFlags(globalExtraFlags));
  args.push(...splitFlags(mount.extraFlags));
  return args;
}

/* --------------------------------------------------------------- rc client */

function rcCall(rc, method, params = {}, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const body = Buffer.from(JSON.stringify(params), 'utf8');
    const req = http.request(
      {
        host: '127.0.0.1',
        port: rc.port,
        method: 'POST',
        path: `/${method}`,
        timeout,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': body.length,
          Authorization: `Basic ${Buffer.from(`${rc.user}:${rc.pass}`).toString('base64')}`,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode < 200 || res.statusCode >= 300) {
            return reject(new Error(`rc ${method} -> HTTP ${res.statusCode}: ${text.slice(0, 200)}`));
          }
          try {
            resolve(text ? JSON.parse(text) : {});
          } catch {
            resolve({ raw: text });
          }
        });
        res.on('error', reject);
      }
    );
    req.on('timeout', () => req.destroy(new Error(`rc ${method}: tiempo de espera agotado.`)));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function newRcSession(port) {
  return {
    port,
    user: 'omnimount',
    pass: crypto.randomBytes(24).toString('base64url'),
  };
}

/* --------------------------------------------------------------- one-shots */

function run(args, env, timeout = 60000) {
  return new Promise((resolve, reject) => {
    execFile(
      rcloneExe,
      args,
      { env, timeout, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (err, stdout, stderr) => {
        if (err) {
          const detail = String(stderr || '').trim() || err.message;
          return reject(new Error(detail));
        }
        resolve(String(stdout));
      }
    );
  });
}

/** Ask rclone itself whether it can read the remote, as a pre-mount check. */
async function probeRemote(mount, connection) {
  const env = await buildEnv(connection);
  const target = remotePath(mount);
  // lsjson has no --limit flag; lsf keeps the reply small on a big remote.
  await run(['lsf', target, '--max-depth', '1'], env, 30000);
  return true;
}

async function version() {
  if (!fs.existsSync(rcloneExe)) return null;
  try {
    const out = await run(['version'], process.env, 10000);
    const match = /rclone\s+v([\d.]+)/i.exec(out);
    return match ? match[1] : 'desconocida';
  } catch {
    return null;
  }
}

module.exports = {
  REMOTE,
  run,
  obscure,
  buildEnv,
  buildMountArgs,
  remotePath,
  freePort,
  newRcSession,
  rcCall,
  probeRemote,
  version,
  volumeName,
  splitFlags,
};
