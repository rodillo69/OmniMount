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
 * Credentials go in the environment, never in argv: a process command line is
 * readable by other processes on the machine (WMI, Get-Process), an
 * environment block is not.
 */
function buildEnv(connection, extra = {}) {
  return {
    ...process.env,
    [`RCLONE_CONFIG_${REMOTE}_TYPE`]: 's3',
    // "Other" is the generic S3 profile; StorageGRID is not a named provider
    // in rclone and the generic one behaves correctly against it.
    [`RCLONE_CONFIG_${REMOTE}_PROVIDER`]: 'Other',
    [`RCLONE_CONFIG_${REMOTE}_ACCESS_KEY_ID`]: connection.accessKeyId,
    [`RCLONE_CONFIG_${REMOTE}_SECRET_ACCESS_KEY`]: connection.secretAccessKey,
    [`RCLONE_CONFIG_${REMOTE}_ENDPOINT`]: connection.endpoint,
    [`RCLONE_CONFIG_${REMOTE}_REGION`]: connection.region || 'us-east-1',
    [`RCLONE_CONFIG_${REMOTE}_FORCE_PATH_STYLE`]:
      connection.forcePathStyle === false ? 'false' : 'true',
    // Without this rclone probes or tries to create the bucket on mount, which
    // fails when the key has no bucket-level permissions.
    [`RCLONE_CONFIG_${REMOTE}_NO_CHECK_BUCKET`]:
      connection.noCheckBucket === false ? 'false' : 'true',
    RCLONE_CONFIG: emptyConfigPath(),
    ...extra,
  };
}

function remotePath(mount) {
  const parts = [mount.bucket, mount.prefix].filter(Boolean).join('/');
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

function cacheModeFlags(mount) {
  const flags = ['--vfs-cache-mode', mount.cacheMode];
  if (mount.cacheMode === 'writes' || mount.cacheMode === 'full') {
    flags.push(
      '--vfs-cache-max-size',
      `${mount.cacheMaxSizeGB}G`,
      '--vfs-cache-max-age',
      `${mount.cacheMaxAgeHours}h`,
      // Per-mount cache directory: the remote name is shared, so without this
      // two mounts of different buckets would write into the same cache tree.
      '--cache-dir',
      mountCacheDir(mount.id)
    );
  }
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

function buildMountArgs(mount, rc, globalExtraFlags = '') {
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

  args.push(...cacheModeFlags(mount));
  args.push(
    '--dir-cache-time',
    `${mount.dirCacheSeconds}s`,
    // S3 cannot notify about remote changes, so polling only burns requests.
    '--poll-interval',
    '0',
    '--transfers',
    String(mount.transfers),
    '--checkers',
    String(mount.checkers)
  );

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
  const env = buildEnv(connection);
  const target = remotePath(mount);
  await run(['lsjson', target, '--max-depth', '1', '--limit', '1'], env, 30000);
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
