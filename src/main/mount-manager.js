'use strict';
const fs = require('node:fs');
const { EventEmitter } = require('node:events');
const { spawn, execFile } = require('node:child_process');
const { rcloneExe, mountCacheDir } = require('./paths');
const rclone = require('./rclone');
const drives = require('./drives');
const deps = require('./deps');
const store = require('./store');
const log = require('./logger').scoped('mounts');

const LOG_LINES_KEPT = 1500;
const MOUNT_TIMEOUT_MS = 25000;
const UNMOUNT_TIMEOUT_MS = 12000;
const STATS_INTERVAL_MS = 2000;
const MAX_RESTART_ATTEMPTS = 3;

/** States: unmounted | mounting | mounted | unmounting | error */
class MountManager extends EventEmitter {
  constructor() {
    super();
    this.runtime = new Map();
    this.statsTimer = null;
    this.shuttingDown = false;
  }

  /* ------------------------------------------------------------- runtime */

  entry(mountId) {
    if (!this.runtime.has(mountId)) {
      this.runtime.set(mountId, {
        id: mountId,
        state: 'unmounted',
        pid: null,
        child: null,
        rc: null,
        since: null,
        error: null,
        logs: [],
        stats: null,
        restartAttempts: 0,
        mountedAt: null,
      });
    }
    return this.runtime.get(mountId);
  }

  status(mountId) {
    const run = this.entry(mountId);
    return {
      id: run.id,
      state: run.state,
      pid: run.pid,
      error: run.error,
      since: run.since,
      mountedAt: run.mountedAt,
      stats: run.stats,
      restartAttempts: run.restartAttempts,
    };
  }

  allStatuses() {
    return store.listMounts().map((mount) => this.status(mount.id));
  }

  setState(mountId, state, patch = {}) {
    const run = this.entry(mountId);
    run.state = state;
    run.since = new Date().toISOString();
    Object.assign(run, patch);
    this.emit('state', this.status(mountId));
  }

  appendLog(mountId, line, level = 'info') {
    const run = this.entry(mountId);
    const record = { at: new Date().toISOString(), level, line };
    run.logs.push(record);
    if (run.logs.length > LOG_LINES_KEPT) {
      run.logs.splice(0, run.logs.length - LOG_LINES_KEPT);
    }
    this.emit('log', { mountId, entry: record });
  }

  getLogs(mountId) {
    return this.entry(mountId).logs.slice();
  }

  clearLogs(mountId) {
    this.entry(mountId).logs = [];
    this.emit('log', { mountId, cleared: true });
  }

  /* ------------------------------------------------------------ mounting */

  async mount(mountId, { isRestart = false } = {}) {
    const mount = store.getMount(mountId);
    if (!mount) throw new Error('La unidad no existe.');

    const run = this.entry(mountId);
    if (run.state === 'mounted') return this.status(mountId);
    if (run.state === 'mounting') throw new Error('Esa unidad ya se esta montando.');

    if (!isRestart) run.restartAttempts = 0;
    run.error = null;
    this.setState(mountId, 'mounting');

    try {
      await this.preflight(mount);

      const connection = await store.getConnectionSecret(mount.connectionId);
      if (!connection) throw new Error('La conexion asociada ya no existe.');
      if (!connection.secretAccessKey) {
        throw new Error('No se pudo recuperar la Secret Key guardada. Vuelve a introducirla en la conexion.');
      }

      const rc = rclone.newRcSession(await rclone.freePort());
      const args = rclone.buildMountArgs(mount, rc);
      const env = rclone.buildEnv(connection);

      if (mount.cacheMode === 'writes' || mount.cacheMode === 'full') {
        fs.mkdirSync(mountCacheDir(mount.id), { recursive: true });
      }

      this.appendLog(
        mountId,
        `Montando ${mount.bucket}${mount.prefix ? `/${mount.prefix}` : ''} en ${mount.driveLetter}: ...`,
        'system'
      );
      // Las credenciales de S3 no aparecen aquí porque viajan en el entorno,
      // pero la contraseña de la API de control sí está entre los argumentos
      // y hay que taparla: este registro se exporta y se manda a soporte.
      this.appendLog(mountId, `rclone ${redactArgs(args)}`, 'debug');

      const child = spawn(rcloneExe, args, { env, windowsHide: true });
      run.child = child;
      run.pid = child.pid;
      run.rc = rc;

      this.wireProcess(mountId, child);

      await this.waitForDrive(mountId, mount, child);

      run.mountedAt = new Date().toISOString();
      run.restartAttempts = 0;
      this.setState(mountId, 'mounted', { error: null });
      this.appendLog(mountId, `Unidad ${mount.driveLetter}: disponible.`, 'system');
      this.ensureStatsLoop();
      return this.status(mountId);
    } catch (err) {
      await this.forceStop(mountId);
      this.setState(mountId, 'error', { error: err.message });
      this.appendLog(mountId, `Error al montar: ${err.message}`, 'error');
      log.error(`montaje ${mountId} fallido:`, err.message);
      throw err;
    }
  }

  async preflight(mount) {
    const status = await deps.checkAll();
    if (!status.winfsp.installed) {
      throw new Error('Falta el controlador de unidad. Instálalo desde Ajustes > Componentes.');
    }
    if (!status.rclone.installed) {
      throw new Error('Falta el motor de transferencia. Instálalo desde Ajustes > Componentes.');
    }

    // A letter that already resolves cannot be used, but if it is one of ours
    // in a stale state we clean it up first rather than refusing.
    if (drives.isLetterPresent(mount.driveLetter)) {
      const ours = [...this.runtime.values()].find((run) => {
        const candidate = store.getMount(run.id);
        return candidate && candidate.driveLetter === mount.driveLetter && run.child;
      });
      if (ours && ours.id !== mount.id) {
        throw new Error(
          `La letra ${mount.driveLetter}: la ocupa la unidad "${store.getMount(ours.id).name}".`
        );
      }
      if (!ours) {
        throw new Error(
          `La letra ${mount.driveLetter}: ya esta en uso en Windows. Elige otra letra para esta unidad.`
        );
      }
    }
  }

  wireProcess(mountId, child) {
    const take = (buffer, level) => (chunk) => {
      buffer.text += chunk.toString('utf8');
      const lines = buffer.text.split(/\r?\n/);
      buffer.text = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        this.appendLog(mountId, line, classifyLine(line) || level);
      }
    };

    const outBuf = { text: '' };
    const errBuf = { text: '' };
    child.stdout.on('data', take(outBuf, 'info'));
    // rclone writes its whole log to stderr; severity comes from the line
    // itself, not from the stream it arrived on.
    child.stderr.on('data', take(errBuf, 'info'));

    child.on('exit', (code, signal) => {
      this.handleExit(mountId, code, signal);
    });
    child.on('error', (err) => {
      this.appendLog(mountId, `No se pudo lanzar rclone: ${err.message}`, 'error');
    });
  }

  /**
   * A mount is only real once Windows can resolve the drive letter. We race
   * that against the process dying, so a bad bucket or credential surfaces as
   * an error instead of a timeout.
   */
  waitForDrive(mountId, mount, child) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      let settled = false;

      const finish = (err) => {
        if (settled) return;
        settled = true;
        clearInterval(timer);
        child.removeListener('exit', onEarlyExit);
        if (err) reject(err);
        else resolve();
      };

      const onEarlyExit = (code) => {
        const tail = this.entry(mountId)
          .logs.filter((entry) => entry.level === 'error' || entry.level === 'warn')
          .slice(-4)
          .map((entry) => entry.line)
          .join(' | ');
        finish(new Error(explainFailure(tail, code)));
      };
      child.once('exit', onEarlyExit);

      const timer = setInterval(() => {
        if (drives.isLetterPresent(mount.driveLetter)) return finish(null);
        if (Date.now() - started > MOUNT_TIMEOUT_MS) {
          finish(
            new Error(
              `La unidad ${mount.driveLetter}: no aparecio en ${MOUNT_TIMEOUT_MS / 1000} s. Revisa el registro de la unidad.`
            )
          );
        }
      }, 250);
    });
  }

  /* ---------------------------------------------------------- unmounting */

  async unmount(mountId, { quiet = false } = {}) {
    const run = this.entry(mountId);
    const mount = store.getMount(mountId);

    if (!run.child && run.state !== 'mounted') {
      this.setState(mountId, 'unmounted', { error: null, stats: null, mountedAt: null });
      return this.status(mountId);
    }

    this.setState(mountId, 'unmounting');
    if (!quiet) this.appendLog(mountId, 'Desmontando...', 'system');

    // Ask rclone to quit so it can flush pending uploads from the write cache;
    // killing it outright would discard them.
    if (run.rc) {
      try {
        await rclone.rcCall(run.rc, 'core/quit', {}, 5000);
      } catch (err) {
        this.appendLog(mountId, `El cierre ordenado no respondio (${err.message}).`, 'warn');
      }
    }

    const exited = await this.waitForExit(mountId, UNMOUNT_TIMEOUT_MS);
    if (!exited) {
      this.appendLog(mountId, 'No respondio, se fuerza el cierre del proceso.', 'warn');
      await this.forceStop(mountId);
    }

    this.setState(mountId, 'unmounted', { error: null, stats: null, pid: null, mountedAt: null });
    if (!quiet && mount) {
      this.appendLog(mountId, `Unidad ${mount.driveLetter}: desmontada.`, 'system');
    }
    this.ensureStatsLoop();
    return this.status(mountId);
  }

  waitForExit(mountId, timeout) {
    const run = this.entry(mountId);
    if (!run.child) return Promise.resolve(true);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(false), timeout);
      run.child.once('exit', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  forceStop(mountId) {
    const run = this.entry(mountId);
    const child = run.child;
    if (!child || child.exitCode !== null) {
      run.child = null;
      run.pid = null;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      // /T also takes down anything rclone spawned, /F skips the polite ask.
      execFile('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => {
        try {
          child.kill();
        } catch {
          /* already gone */
        }
        run.child = null;
        run.pid = null;
        resolve();
      });
    });
  }

  handleExit(mountId, code, signal) {
    const run = this.entry(mountId);
    run.child = null;
    run.pid = null;
    run.rc = null;

    // Expected exits are driven by unmount() and by app shutdown.
    if (this.shuttingDown || run.state === 'unmounting' || run.state === 'unmounted') return;

    const mount = store.getMount(mountId);
    this.appendLog(
      mountId,
      `rclone termino inesperadamente (codigo ${code}${signal ? `, senal ${signal}` : ''}).`,
      'error'
    );

    const wasMounted = run.state === 'mounted';
    this.setState(mountId, 'error', {
      error: 'La unidad se desconecto de forma inesperada.',
      stats: null,
      mountedAt: null,
    });
    this.ensureStatsLoop();

    if (wasMounted && mount && mount.autoRestart && run.restartAttempts < MAX_RESTART_ATTEMPTS) {
      run.restartAttempts += 1;
      const delay = 2000 * run.restartAttempts;
      this.appendLog(
        mountId,
        `Reintento automatico ${run.restartAttempts}/${MAX_RESTART_ATTEMPTS} en ${delay / 1000} s.`,
        'system'
      );
      setTimeout(() => {
        if (this.shuttingDown) return;
        this.mount(mountId, { isRestart: true }).catch(() => {
          /* state and log already reflect the failure */
        });
      }, delay);
    } else if (wasMounted && run.restartAttempts >= MAX_RESTART_ATTEMPTS) {
      this.appendLog(mountId, 'Se agotaron los reintentos automaticos.', 'error');
    }
  }

  /* ---------------------------------------------------------------- stats */

  ensureStatsLoop() {
    const anyMounted = [...this.runtime.values()].some((run) => run.state === 'mounted');
    if (anyMounted && !this.statsTimer) {
      this.statsTimer = setInterval(() => this.pollStats(), STATS_INTERVAL_MS);
    } else if (!anyMounted && this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
  }

  async pollStats() {
    const mounted = [...this.runtime.values()].filter((run) => run.state === 'mounted' && run.rc);
    await Promise.all(
      mounted.map(async (run) => {
        try {
          const [core, vfs] = await Promise.all([
            rclone.rcCall(run.rc, 'core/stats', {}, 4000),
            rclone.rcCall(run.rc, 'vfs/stats', {}, 4000).catch(() => null),
          ]);
          const cache = vfs && vfs.diskCache ? vfs.diskCache : null;
          run.stats = {
            bytes: core.bytes || 0,
            speed: core.speed || 0,
            transfers: core.transfers || 0,
            errors: core.errors || 0,
            checks: core.checks || 0,
            elapsedTime: core.elapsedTime || 0,
            transferring: Array.isArray(core.transferring)
              ? core.transferring.slice(0, 5).map((t) => ({
                  name: t.name,
                  bytes: t.bytes,
                  size: t.size,
                  percentage: t.percentage,
                  speed: t.speed,
                }))
              : [],
            cache: cache
              ? {
                  bytesUsed: cache.bytesUsed || 0,
                  files: cache.files || 0,
                  uploadsInProgress: cache.uploadsInProgress || 0,
                  uploadsQueued: cache.uploadsQueued || 0,
                  erroredFiles: cache.erroredFiles || 0,
                  outOfSpace: Boolean(cache.outOfSpace),
                }
              : null,
            at: Date.now(),
          };
          this.emit('stats', { mountId: run.id, stats: run.stats });
        } catch {
          // A single failed poll is not worth surfacing; the process watcher
          // reports a genuinely dead mount.
        }
      })
    );
  }

  /* --------------------------------------------------------------- extras */

  /** Drop the directory cache so a change made elsewhere shows up at once. */
  async refresh(mountId) {
    const run = this.entry(mountId);
    if (run.state !== 'mounted' || !run.rc) throw new Error('La unidad no esta montada.');
    await rclone.rcCall(run.rc, 'vfs/forget', {}, 8000);
    this.appendLog(mountId, 'Cache de directorios vaciada.', 'system');
    return true;
  }

  async mountAll(ids) {
    const targets = ids || store.listMounts().filter((m) => m.autoMount).map((m) => m.id);
    const results = [];
    for (const id of targets) {
      try {
        await this.mount(id);
        results.push({ id, ok: true });
      } catch (err) {
        results.push({ id, ok: false, error: err.message });
      }
    }
    return results;
  }

  async unmountAll({ quiet = false } = {}) {
    const active = [...this.runtime.values()].filter(
      (run) => run.state === 'mounted' || run.state === 'mounting' || run.child
    );
    await Promise.all(active.map((run) => this.unmount(run.id, { quiet }).catch(() => null)));
  }

  async shutdown() {
    this.shuttingDown = true;
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
      this.statsTimer = null;
    }
    const active = [...this.runtime.values()].filter((run) => run.child);
    // Flush write caches where possible, then make sure nothing is left behind
    // holding a drive letter.
    await Promise.all(
      active.map(async (run) => {
        if (run.rc) {
          try {
            await rclone.rcCall(run.rc, 'core/quit', {}, 4000);
          } catch {
            /* fall through to the kill below */
          }
        }
        const exited = await this.waitForExit(run.id, 6000);
        if (!exited) await this.forceStop(run.id);
      })
    );
  }
}

/* --------------------------------------------------------------- helpers */

// Argumentos cuyo valor no puede acabar en el registro. Hoy sólo los de la
// API de control, pero cualquier secreto que se añada debe entrar aquí.
const SECRET_ARGS = new Set(['--rc-pass', '--rc-user']);

/** Tapa el valor que sigue a cada argumento sensible. */
function redactArgs(args) {
  const safe = [];
  for (let i = 0; i < args.length; i++) {
    safe.push(args[i]);
    if (SECRET_ARGS.has(args[i]) && i + 1 < args.length) {
      safe.push('********');
      i += 1;
    }
  }
  return safe.join(' ');
}

// rclone marca como ERROR algunas cosas que no lo son. Pintarlas de rojo en el
// registro sólo consigue que el usuario crea que hay un problema y deje de
// mirar las que sí importan.
const BENIGN = [
  // Sale en cada montaje: el punto de montaje no es un enlace simbólico y no
  // se pretende que lo sea.
  /symlinks not supported without the --links flag/i,
];

function classifyLine(line) {
  if (BENIGN.some((pattern) => pattern.test(line))) return 'debug';
  if (/\bERROR\b|\bCRITICAL\b|\bFatal error\b/i.test(line)) return 'error';
  if (/\bNOTICE\b|\bWARNING\b/i.test(line)) return 'warn';
  if (/\bDEBUG\b/i.test(line)) return 'debug';
  return null;
}

/**
 * rclone exits with a generic status for very different problems, so we turn
 * the log tail into something a user can act on.
 */
function explainFailure(tail, code) {
  const text = String(tail || '');
  if (/cannot find winfsp|winfsp.*not.*found|failed to load winfsp/i.test(text)) {
    return 'No se encontró el controlador de unidad. Reinicia el equipo y vuelve a intentarlo.';
  }
  if (/mountpoint.*in use|already exists|is already mounted/i.test(text)) {
    return 'La letra de unidad ya esta ocupada. Elige otra.';
  }
  if (/SignatureDoesNotMatch/i.test(text)) {
    return 'La Secret Key no es correcta para esta Access Key.';
  }
  if (/InvalidAccessKeyId/i.test(text)) {
    return 'La Access Key no existe en este endpoint.';
  }
  if (/AccessDenied|403/i.test(text)) {
    return 'Acceso denegado: la clave no tiene permiso sobre ese bucket o prefijo.';
  }
  if (/NoSuchBucket/i.test(text)) {
    return 'El bucket indicado no existe en este endpoint.';
  }
  if (/no such host|dial tcp|connection refused|timeout|i\/o timeout/i.test(text)) {
    return 'No se pudo contactar con el endpoint. Revisa la URL, la red o la VPN.';
  }
  if (/certificate|x509|tls/i.test(text)) {
    return 'Fallo de certificado TLS contra el endpoint.';
  }
  if (text) return `rclone no pudo montar la unidad: ${text.slice(0, 300)}`;
  return `rclone termino con el codigo ${code} antes de montar la unidad.`;
}

module.exports = new MountManager();
