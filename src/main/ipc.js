'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { ipcMain, dialog, shell, app, nativeTheme } = require('electron');
const store = require('./store');
const deps = require('./deps');
const backends = require('./backends');
const remoteFs = require('./remote-fs');
const updater = require('./updater');
const drives = require('./drives');
const elevation = require('./elevation');
const defaults = require('./defaults');
const rclone = require('./rclone');
const mounts = require('./mount-manager');
const { dirs } = require('./paths');
const logger = require('./logger');
const log = logger.scoped('ipc');

let window = null;

function setWindow(win) {
  window = win;
  if (win) watchWindowState(win);
}

function send(channel, payload) {
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, payload);
  }
}

/** The live window, or null once it has gone. */
function getWindow() {
  return window && !window.isDestroyed() ? window : null;
}

/**
 * Keep the renderer's maximise button in step with the real window state,
 * which also changes by double-clicking the bar or by Win+Up.
 */
function watchWindowState(win) {
  const report = () => send('window:state', { maximized: win.isMaximized() });
  win.on('maximize', report);
  win.on('unmaximize', report);
}

/**
 * Every handler returns {ok, data} or {ok:false, error} so the renderer never
 * has to deal with raw IPC rejections and can always show a message.
 */
function handle(channel, fn) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (err) {
      log.error(`${channel}:`, err.message);
      // `code` travels alongside the message so the interface can show the
      // translated text for the failures it knows, instead of the Spanish
      // string this process happened to build.
      return { ok: false, error: err.message || String(err), code: err.code || null };
    }
  });
}

/**
 * Registra o quita OmniMount de los programas de inicio del usuario, segun
 * los ajustes. Es lo que hace que las unidades vuelvan tras un reinicio.
 */
function applyLoginItem() {
  const settings = store.getSettings();
  app.setLoginItemSettings({
    openAtLogin: Boolean(settings.autostart),
    args: settings.startMinimized ? ['--minimized'] : [],
  });
}

/**
 * A connection ready to hand to rclone.
 *
 * `draft` lets the form test credentials that have not been saved yet: it
 * carries the same shape a stored connection has once decrypted, so both
 * paths produce exactly the same thing and the test cannot differ from the
 * real mount.
 */
async function liveConnection(connectionId, draft) {
  if (draft && draft.type) {
    return {
      type: draft.type,
      config: draft.config || {},
      obscuredFields: draft.obscuredFields || [],
    };
  }

  const conn = await store.getConnectionSecret(connectionId);
  if (!conn) throw new Error('That connection no longer exists.');
  if (conn.needsSecret && !conn.hasSecret) {
    throw new Error('This connection has no stored credentials. Edit it to enter them again.');
  }
  return conn;
}

/**
 * Check a draft against the backend catalogue before anything is saved.
 *
 * rclone states which of its own fields are required, so the rules come from
 * there rather than from a list kept in step by hand.
 */
async function validateDraft(type, config) {
  const backend = await backends.byName(type);
  if (!backend) throw new Error(`Unknown storage type: ${type}`);
  if (backend.needsOAuth) {
    throw new Error(`${backend.label} needs browser sign-in, which is not supported yet.`);
  }

  const missing = backend.fields
    .filter((f) => f.required && !f.advanced)
    .filter((f) => {
      const value = config[f.name];
      return value === undefined || value === null || String(value).trim() === '';
    })
    .map((f) => f.label);

  if (missing.length) {
    throw new Error(`These fields are required: ${missing.join(', ')}.`);
  }

  return backend;
}


/** A default name for a connection: the server it points at. */
function connectionName(backend, config) {
  const host = config.endpoint || config.url || config.host || '';
  const clean = String(host).replace(/^[a-z]+:[/][/]/, '').replace(/[/]+$/, '');
  return clean || backend.label;
}

function register() {
  /* ------------------------------------------------------------- app */

  handle('app:info', async () => ({
    version: app.getVersion(),
    name: app.getName(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: `${process.platform} ${process.arch}`,
    userData: dirs.userData,
    logPath: logger.logFile,
    cacheDir: dirs.cache,
    encryptionAvailable: await store.encryptionAvailable(),
    rcloneVersion: await rclone.version(),
    // Read before the first screen is painted: if the app is elevated, no
    // drive it mounts will be visible to the user, and there is no point
    // letting them configure one first.
    elevation: await elevation.read(),
  }));

  handle('app:relaunchUnelevated', async () => {
    // The lock goes first. The copy Explorer is about to start asks for it
    // before it opens a window, and this process still holds it for as long
    // as it takes to exit — so without this the new copy would see a running
    // instance, quit, and the button would appear to do nothing.
    app.releaseSingleInstanceLock();

    try {
      await elevation.relaunchUnelevated();
    } catch (err) {
      // Nothing was started, so this copy takes the lock back rather than
      // leaving the next launch to fight a process that no longer owns it.
      app.requestSingleInstanceLock();
      throw err;
    }

    // Nothing is mounted at this point, so there is nothing to flush. The
    // delay only lets the reply reach the window before the process goes.
    setTimeout(() => app.exit(0), 700);
    return true;
  });

  handle('app:openPath', async (target) => {
    const result = await shell.openPath(target);
    if (result) throw new Error(result);
    return true;
  });

  handle('app:openExternal', async (url) => {
    if (!/^https?:\/\//i.test(url)) throw new Error('Solo se abren URLs http o https.');
    await shell.openExternal(url);
    return true;
  });

  handle('app:revealLog', async () => {
    shell.showItemInFolder(logger.logFile);
    return true;
  });

  /* ---------------------------------------------------------- requisitos */

  handle('deps:check', () => deps.checkAll());

  handle('deps:installRclone', () =>
    deps.installRclone((progress) => send('deps:progress', { id: 'rclone', ...progress }))
  );

  handle('deps:installWinFsp', () =>
    deps.installWinFsp((progress) => send('deps:progress', { id: 'winfsp', ...progress }))
  );

  // Instalación desatendida: la interfaz la lanza sola en el primer arranque.
  handle('deps:ensure', () => deps.ensureAll((progress) => send('deps:progress', progress)));

  /* ------------------------------------------------------------ ajustes */

  handle('settings:get', () => store.getSettings());

  handle('settings:update', (patch) => {
    const next = store.updateSettings(patch || {});
    if (Object.prototype.hasOwnProperty.call(patch || {}, 'theme')) {
      nativeTheme.themeSource = next.theme;
    }
    if (
      Object.prototype.hasOwnProperty.call(patch || {}, 'autostart') ||
      Object.prototype.hasOwnProperty.call(patch || {}, 'startMinimized')
    ) {
      applyLoginItem();
    }
    send('settings:changed', next);
    return next;
  });

  /* -------------------------------------------------------- conexiones */

  handle('conn:list', () => store.listConnections());
  handle('conn:save', (input) => store.saveConnection(input));
  handle('conn:delete', (id) => {
    store.deleteConnection(id);
    return true;
  });

  handle('conn:test', async ({ connectionId, root, draft } = {}) => {
    const conn = await liveConnection(connectionId, draft);
    return remoteFs.test(conn, root || '');
  });

  /* ---------------------------------------------------------- backends */

  /** Every storage type the installed rclone supports, with its own fields. */
  handle('backends:list', () => backends.catalogue());
  handle('backends:get', (name) => backends.byName(name));

  /* -------------------------------------------------------------- disco */

  handle('drives:free', () => drives.freeLetters());
  handle('drives:suggest', (preferred) => drives.suggestLetter(preferred || []));

  /* ------------------------------------------------------ drive creation */

  /**
   * Create a drive in one call: validate the fields, check the remote is
   * reachable, reuse or create the connection, then save the mount.
   *
   * The handler knows nothing about any particular backend. The renderer
   * sends the storage type and a bag of values named after rclone's own
   * fields; the catalogue says which are required and which are secret.
   */
  handle('setup:createDrive', async (input) => {
    const data = input || {};
    const type = data.type || 's3';

    const backend = await validateDraft(type, data.config || {});

    // The root is the bucket, container, share or folder the drive starts at,
    // depending on the backend. Some have none at all.
    const root = String(data.root || '').trim().replace(/^\/+|\/+$/g, '');
    if (backend.root && backend.root.required && !root) {
      throw new Error(`${backend.root.label} is required.`);
    }

    // Split what the user typed into plain values and ones to encrypt.
    const secretNames = new Set(backend.fields.filter((f) => f.secret || f.sensitive).map((f) => f.name));
    const obscuredFields = backend.fields.filter((f) => f.secret).map((f) => f.name);

    const config = {};
    const secrets = {};
    for (const [key, value] of Object.entries(data.config || {})) {
      if (value === undefined || value === null || value === '') continue;
      if (secretNames.has(key)) secrets[key] = String(value);
      else config[key] = String(value);
    }

    let connectionId = data.connectionId || null;
    let probe;

    if (Object.keys(secrets).length || !connectionId) {
      probe = { type, config: { ...config, ...secrets }, obscuredFields };
    } else {
      probe = await store.getConnectionSecret(connectionId);
      if (!probe) throw new Error('The stored credentials could not be read. Enter them again.');
    }

    // Check against the real server before saving anything, so a bad value
    // shows up in the form rather than as a mount that fails later.
    const test = await remoteFs.test(probe, root);
    if (!test.ok) {
      const err = new Error(test.message);
      err.field = /credential|rejected|login|key|secret/i.test(test.message)
        ? 'credentials'
        : 'root';
      throw err;
    }

    if (Object.keys(secrets).length) {
      // Reuse a connection that already points at the same place with the
      // same identity, rather than accumulating duplicates.
      const fingerprint = JSON.stringify(config);
      const existing = store
        .listConnections()
        .find((c) => c.type === type && JSON.stringify(c.config || {}) === fingerprint);

      const saved = await store.saveConnection({
        id: existing ? existing.id : undefined,
        name: existing ? existing.name : connectionName(backend, config),
        type,
        config,
        secrets,
        obscuredFields,
      });
      connectionId = saved.id;
    }

    if (!connectionId) throw new Error('Credentials are required.');

    const letter =
      data.driveLetter || (await drives.suggestLetter(['S', 'T', 'U', 'V', 'W', 'Y', 'Z']));
    if (!letter) throw new Error('No queda ninguna letra de unidad libre en este equipo.');

    const isFirstDrive = store.listMounts().length === 0;

    const saved = store.saveMount({
      id: data.id || undefined,
      name: (data.name || '').trim() || root || backend.label,
      connectionId,
      root,
      bucket: root,
      prefix: data.prefix || '',
      driveLetter: letter,
      volumeLabel: (data.name || '').trim() || root || backend.label,
      readOnly: Boolean(data.readOnly),
      autoMount: data.autoMount !== false,
      ...defaults.MOUNT,
      // After the defaults, so a capacity the user typed is not overwritten
      // by the default of claiming nothing.
      reportedSizeTB: Number(data.reportedSizeTB) > 0 ? Number(data.reportedSizeTB) : 0,
    });

    // Para que la unidad sobreviva a un reinicio hace falta que la aplicación
    // vuelva a arrancar sola. Se activa al crear la primera, que es cuando
    // empieza a tener sentido, y queda visible en Ajustes por si molesta.
    if (isFirstDrive) {
      store.updateSettings({ autostart: true, mountOnStart: true });
    }
    applyLoginItem();

    // Mount it here, and report what actually happened.
    //
    // Reading the remote is not the same as mounting it: the credentials can
    // be perfect and the drive still never appear, because the driver is not
    // loaded or because Windows will not show a letter this process created.
    // Saying "drive created" on the strength of the credentials alone is how
    // someone ends up with a drive the app calls valid and Explorer does not
    // have. So the answer carries the mount result, and the caller decides
    // what to tell the user.
    let mountOk = false;
    let mountError = null;
    try {
      await mounts.mount(saved.id);
      mountOk = true;
    } catch (err) {
      mountError = err.message;
      log.warn(`La unidad ${saved.id} se guardó pero no se pudo montar:`, err.message);
    }

    return { ...saved, mountOk, mountError };
  });

  /**
   * Regiones disponibles y qué claves hay guardadas en cada una. El alta usa
   * esto para pedir credenciales sólo cuando la región elegida no las tiene.
   */
  /* ----------------------------------------------------------- updates */

  updater.register(send);
  handle('update:state', () => updater.getState());
  handle('update:check', () => updater.check());
  handle('update:download', () => updater.download());
  handle('update:install', () => updater.installNow());

  /* ------------------------------------------------------- window frame */

  // The title bar is ours, so minimise/maximise/close arrive over IPC.
  handle('window:minimize', () => {
    const w = getWindow();
    if (w) w.minimize();
  });

  handle('window:toggle-maximize', () => {
    const w = getWindow();
    if (!w) return { maximized: false };
    if (w.isMaximized()) w.unmaximize();
    else w.maximize();
    return { maximized: w.isMaximized() };
  });

  handle('window:close', () => {
    const w = getWindow();
    if (w) w.close();
  });

  handle('window:state', () => {
    const w = getWindow();
    return { maximized: Boolean(w && w.isMaximized()) };
  });

  /** Saved credentials, so the form can offer them instead of asking again. */
  handle('setup:credentials', () => ({
    saved: store
      .listConnections()
      .filter((c) => c.hasSecret)
      .map((c) => ({ id: c.id, endpoint: c.endpoint, accessKeyId: c.accessKeyId })),
  }));

  /* ----------------------------------------------------------- unidades */

  handle('mounts:list', () => ({
    mounts: store.listMounts(),
    statuses: mounts.allStatuses(),
  }));

  handle('mounts:save', (input) => store.saveMount(input));

  handle('mounts:delete', async (id) => {
    const run = mounts.status(id);
    if (run.state === 'mounted' || run.state === 'mounting') {
      await mounts.unmount(id);
    }
    store.deleteMount(id);
    return true;
  });

  handle('mounts:status', (id) => (id ? mounts.status(id) : mounts.allStatuses()));
  handle('mounts:mount', (id) => mounts.mount(id));
  handle('mounts:unmount', (id) => mounts.unmount(id));

  handle('mounts:remount', async (id) => {
    await mounts.unmount(id);
    return mounts.mount(id);
  });

  handle('mounts:refresh', (id) => mounts.refresh(id));
  handle('mounts:mountAll', (ids) => mounts.mountAll(ids));
  handle('mounts:unmountAll', () => mounts.unmountAll());
  handle('mounts:logs', (id) => mounts.getLogs(id));
  handle('mounts:clearLogs', (id) => {
    mounts.clearLogs(id);
    return true;
  });

  handle('mounts:open', async (id) => {
    const mount = store.getMount(id);
    if (!mount) throw new Error('La unidad no existe.');
    if (mounts.status(id).state !== 'mounted') throw new Error('La unidad no esta montada.');
    const result = await shell.openPath(`${mount.driveLetter}:\\`);
    if (result) throw new Error(result);
    return true;
  });

  handle('mounts:exportLog', async (id) => {
    const mount = store.getMount(id);
    if (!mount) throw new Error('La unidad no existe.');
    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      title: 'Guardar registro',
      defaultPath: `omnimount-${mount.name.replace(/[^\w.-]+/g, '_')}.log`,
      filters: [{ name: 'Registro', extensions: ['log', 'txt'] }],
    });
    if (canceled || !filePath) return { saved: false };
    const body = mounts
      .getLogs(id)
      .map((entry) => `${entry.at} [${entry.level}] ${entry.line}`)
      .join('\r\n');
    fs.writeFileSync(filePath, body, 'utf8');
    return { saved: true, path: filePath };
  });

  /* --------------------------------------------------------- explorador */

  handle('explorer:list', async ({ connectionId, root, prefix } = {}) => {
    const conn = await liveConnection(connectionId);
    return remoteFs.list(conn, root, prefix || '');
  });

  handle('explorer:usage', async ({ connectionId, root, prefix } = {}) => {
    const conn = await liveConnection(connectionId);
    return remoteFs.usage(conn, root, prefix || '');
  });

  handle('explorer:mkdir', async ({ connectionId, root, prefix, name } = {}) => {
    if (!String(name || '').trim()) throw new Error('Hace falta un nombre de carpeta.');
    if (/[\\/]/.test(name)) throw new Error('El nombre de carpeta no puede contener barras.');
    const conn = await liveConnection(connectionId);
    return remoteFs.createFolder(conn, root, `${prefix || ''}${name.trim()}`);
  });

  handle('explorer:delete', async ({ connectionId, root, items } = {}) => {
    const conn = await liveConnection(connectionId);
    const files = (items || []).filter((i) => i.type === 'file').map((i) => i.key);
    const folders = (items || []).filter((i) => i.type === 'folder').map((i) => i.key);

    const summary = { deleted: 0, errors: [] };
    if (files.length) {
      const res = await remoteFs.deleteFiles(conn, root, files);
      summary.deleted += res.removed;
    }
    for (const folder of folders) {
      await remoteFs.deleteFolder(conn, root, folder);
      summary.deleted += 1;
    }
    return summary;
  });

  handle('explorer:rename', async ({ connectionId, root, key, newName } = {}) => {
    if (!String(newName || '').trim()) throw new Error('Hace falta un nombre.');
    if (/[\\/]/.test(newName)) throw new Error('El nombre no puede contener barras.');
    const conn = await liveConnection(connectionId);
    const parent = key.includes('/') ? `${key.slice(0, key.lastIndexOf('/'))}/` : '';
    return remoteFs.rename(conn, root, key, `${parent}${newName.trim()}`);
  });

  handle('explorer:upload', async ({ connectionId, root, prefix } = {}) => {
    const conn = await liveConnection(connectionId);
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Upload files',
      properties: ['openFile', 'multiSelections'],
    });
    if (canceled || !filePaths.length) return { uploaded: 0, canceled: true };

    const results = { uploaded: 0, errors: [] };
    for (let i = 0; i < filePaths.length; i++) {
      const file = filePaths[i];
      const name = path.basename(file);
      send('explorer:progress', {
        kind: 'upload',
        name,
        index: i + 1,
        total: filePaths.length,
      });
      try {
        await remoteFs.upload(conn, root, `${prefix || ''}${name}`, file);
        results.uploaded += 1;
      } catch (err) {
        results.errors.push({ name, message: err.message });
      }
    }
    send('explorer:progress', { kind: 'upload', done: true });
    return results;
  });

  handle('explorer:download', async ({ connectionId, root, items } = {}) => {
    const conn = await liveConnection(connectionId);
    const files = (items || []).filter((i) => i.type === 'file');
    if (!files.length) throw new Error('Selecciona al menos un fichero.');

    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Carpeta de destino',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (canceled || !filePaths.length) return { downloaded: 0, canceled: true };

    const target = filePaths[0];
    const results = { downloaded: 0, errors: [], path: target };
    for (let i = 0; i < files.length; i++) {
      const item = files[i];
      send('explorer:progress', {
        kind: 'download',
        name: item.name,
        index: i + 1,
        total: files.length,
      });
      try {
        await remoteFs.download(conn, root, item.key, path.join(target, safeName(item.name)));
        results.downloaded += 1;
      } catch (err) {
        results.errors.push({ name: item.name, message: err.message });
      }
    }
    send('explorer:progress', { kind: 'download', done: true });
    return results;
  });

  /* ------------------------------------------------------------ dialogos */

  handle('dialog:confirm', async ({ title, message, detail, confirmLabel, danger } = {}) => {
    const { response } = await dialog.showMessageBox(window, {
      type: danger ? 'warning' : 'question',
      buttons: [confirmLabel || 'Aceptar', 'Cancelar'],
      defaultId: danger ? 1 : 0,
      cancelId: 1,
      title: title || 'Confirmar',
      message: message || '',
      detail: detail || undefined,
      noLink: true,
    });
    return response === 0;
  });
}

function safeName(name) {
  return String(name).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_') || 'descarga';
}

function guessType(name) {
  const ext = path.extname(name).toLowerCase();
  const types = {
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.zip': 'application/zip',
    '.mp4': 'video/mp4',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return types[ext] || 'application/octet-stream';
}

/** Bridge mount-manager events into the renderer. */
function wireMountEvents() {
  mounts.on('state', (status) => send('mounts:state', status));
  mounts.on('stats', (payload) => send('mounts:stats', payload));
  mounts.on('log', (payload) => send('mounts:log', payload));
}

module.exports = { register, setWindow, wireMountEvents, send, applyLoginItem };
