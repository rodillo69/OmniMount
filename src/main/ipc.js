'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { ipcMain, dialog, shell, app, nativeTheme } = require('electron');
const store = require('./store');
const deps = require('./deps');
const s3 = require('./s3');
const drives = require('./drives');
const defaults = require('./defaults');
const rclone = require('./rclone');
const mounts = require('./mount-manager');
const { dirs } = require('./paths');
const logger = require('./logger');
const log = logger.scoped('ipc');

let window = null;

function setWindow(win) {
  window = win;
}

function send(channel, payload) {
  if (window && !window.isDestroyed()) {
    window.webContents.send(channel, payload);
  }
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
      return { ok: false, error: err.message || String(err) };
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

/** Resolve a connection with its decrypted secret, for S3 calls. */
async function liveConnection(connectionId, overrides) {
  if (overrides && overrides.accessKeyId && overrides.secretAccessKey) {
    return {
      endpoint: store.normaliseEndpoint(overrides.endpoint),
      region: overrides.region || 'us-east-1',
      accessKeyId: overrides.accessKeyId,
      secretAccessKey: overrides.secretAccessKey,
      forcePathStyle: overrides.forcePathStyle !== false,
      noCheckBucket: overrides.noCheckBucket !== false,
    };
  }
  const conn = await store.getConnectionSecret(connectionId);
  if (!conn) throw new Error('La conexion no existe.');
  if (!conn.secretAccessKey) {
    throw new Error('La conexion no tiene Secret Key guardada. Editala para volver a introducirla.');
  }
  return conn;
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
    regions: defaults.REGIONS.map((r) => ({ id: r.id, name: r.name, location: r.location, endpoint: r.endpoint })),
    encryptionAvailable: await store.encryptionAvailable(),
    rcloneVersion: await rclone.version(),
  }));

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

  handle('conn:test', async ({ connectionId, bucket, draft } = {}) => {
    const conn = await liveConnection(connectionId, draft);
    return s3.testConnection(conn, bucket || undefined);
  });

  handle('conn:listBuckets', async ({ connectionId, draft } = {}) => {
    const conn = await liveConnection(connectionId, draft);
    return s3.listBuckets(conn);
  });

  /* -------------------------------------------------------------- disco */

  handle('drives:free', () => drives.freeLetters());
  handle('drives:suggest', (preferred) => drives.suggestLetter(preferred || []));

  /* ------------------------------------------------------- alta simple */

  /**
   * Alta de unidad en una sola llamada: comprueba el acceso, reutiliza o crea
   * la conexión y guarda el montaje.
   *
   * La interfaz aporta región, bucket y, si hacen falta, las claves. El
   * endpoint sale de la región elegida: no se teclea.
   */
  handle('setup:createDrive', async (input) => {
    const data = input || {};
    const bucket = String(data.bucket || '').trim().replace(/^\/+|\/+$/g, '');
    if (!bucket) throw new Error('Escribe el nombre del bucket.');

    const region = defaults.resolveRegion(data.regionId);
    const endpoint = region.endpoint;

    // Credenciales: las nuevas que llegan, o las de una conexión ya guardada.
    let connectionId = data.connectionId || null;
    let probe;

    if (data.accessKeyId && data.secretAccessKey) {
      probe = {
        endpoint,
        region: defaults.S3.signingRegion,
        accessKeyId: String(data.accessKeyId).trim(),
        secretAccessKey: String(data.secretAccessKey),
        forcePathStyle: defaults.S3.forcePathStyle,
        noCheckBucket: defaults.S3.noCheckBucket,
      };
    } else if (connectionId) {
      probe = await store.getConnectionSecret(connectionId);
      if (!probe || !probe.secretAccessKey) {
        throw new Error('No se pudieron recuperar las claves guardadas. Introdúcelas de nuevo.');
      }
      // Las claves de una región no valen en la otra: el endpoint devolvería
      // InvalidAccessKeyId. Se detecta aquí, con un mensaje que se entienda.
      if (probe.endpoint !== endpoint) {
        const suya = defaults.regionByEndpoint(probe.endpoint);
        throw new Error(
          `Esas claves son de ${suya ? suya.name : 'otra región'} y no sirven en ${region.name}. ` +
            `Cada región tiene sus propias credenciales.`
        );
      }
    } else {
      throw new Error(`Faltan las claves de acceso de ${region.name}.`);
    }

    // Se comprueba contra el bucket real antes de guardar nada: así el error
    // aparece en el formulario y no como un montaje que falla después.
    const test = await s3.testConnection(probe, bucket);
    if (!test.ok) {
      const err = new Error(test.message);
      err.field = /clave|firma|Signature|AccessKey/i.test(test.message) ? 'credentials' : 'bucket';
      throw err;
    }

    if (data.accessKeyId && data.secretAccessKey) {
      // ¿Ya existe una conexión con esa misma clave en esta región? Se
      // reutiliza en vez de acumular duplicados. La comparación incluye el
      // endpoint porque la misma Access Key podría existir en ambas regiones.
      const existing = store
        .listConnections()
        .find((c) => c.accessKeyId === probe.accessKeyId && c.endpoint === endpoint);

      const saved = await store.saveConnection({
        id: existing ? existing.id : undefined,
        name: existing ? existing.name : `almacenamiento remoto · ${region.name}`,
        regionId: region.id,
        endpoint,
        region: defaults.S3.signingRegion,
        accessKeyId: probe.accessKeyId,
        secretAccessKey: probe.secretAccessKey,
        forcePathStyle: defaults.S3.forcePathStyle,
        noCheckBucket: defaults.S3.noCheckBucket,
      });
      connectionId = saved.id;
    }

    const letter =
      data.driveLetter || (await drives.suggestLetter(['S', 'T', 'U', 'V', 'W', 'Y', 'Z']));
    if (!letter) throw new Error('No queda ninguna letra de unidad libre en este equipo.');

    const isFirstDrive = store.listMounts().length === 0;

    const saved = store.saveMount({
      id: data.id || undefined,
      name: (data.name || '').trim() || bucket,
      connectionId,
      bucket,
      prefix: data.prefix || '',
      driveLetter: letter,
      volumeLabel: (data.name || '').trim() || bucket,
      readOnly: Boolean(data.readOnly),
      autoMount: data.autoMount !== false,
      ...defaults.MOUNT,
    });

    // Para que la unidad sobreviva a un reinicio hace falta que la aplicación
    // vuelva a arrancar sola. Se activa al crear la primera, que es cuando
    // empieza a tener sentido, y queda visible en Ajustes por si molesta.
    if (isFirstDrive) {
      store.updateSettings({ autostart: true, mountOnStart: true });
    }
    applyLoginItem();

    return saved;
  });

  /**
   * Regiones disponibles y qué claves hay guardadas en cada una. El alta usa
   * esto para pedir credenciales sólo cuando la región elegida no las tiene.
   */
  handle('setup:regions', () => {
    const conns = store.listConnections().filter((c) => c.hasSecret);

    return {
      defaultRegionId: defaults.DEFAULT_REGION_ID,
      regions: defaults.REGIONS.map((region) => {
        const propias = conns.filter(
          (c) => (c.regionId || (defaults.regionByEndpoint(c.endpoint) || {}).id) === region.id
        );
        return {
          id: region.id,
          name: region.name,
          location: region.location,
          endpoint: region.endpoint,
          credentials: propias.map((c) => ({ id: c.id, accessKeyId: c.accessKeyId })),
        };
      }),
    };
  });

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

  handle('explorer:list', async ({ connectionId, bucket, prefix, token } = {}) => {
    const conn = await liveConnection(connectionId);
    return s3.listObjects(conn, { bucket, prefix: prefix || '', token, maxKeys: 500 });
  });

  handle('explorer:usage', async ({ connectionId, bucket, prefix } = {}) => {
    const conn = await liveConnection(connectionId);
    return s3.prefixUsage(conn, bucket, prefix || '');
  });

  handle('explorer:mkdir', async ({ connectionId, bucket, prefix, name } = {}) => {
    if (!String(name || '').trim()) throw new Error('Hace falta un nombre de carpeta.');
    if (/[\\/]/.test(name)) throw new Error('El nombre de carpeta no puede contener barras.');
    const conn = await liveConnection(connectionId);
    return s3.createFolder(conn, bucket, `${prefix || ''}${name.trim()}`);
  });

  handle('explorer:delete', async ({ connectionId, bucket, items } = {}) => {
    const conn = await liveConnection(connectionId);
    const files = (items || []).filter((i) => i.type === 'file').map((i) => i.key);
    const folders = (items || []).filter((i) => i.type === 'folder').map((i) => i.key);

    const summary = { deleted: 0, errors: [] };
    if (files.length) {
      const res = await s3.deleteObjects(conn, bucket, files);
      summary.deleted += res.deleted;
      summary.errors.push(...res.errors);
    }
    for (const folder of folders) {
      const res = await s3.deletePrefix(conn, bucket, folder);
      summary.deleted += res.deleted;
      summary.errors.push(...res.errors);
    }
    return summary;
  });

  handle('explorer:rename', async ({ connectionId, bucket, key, newName } = {}) => {
    if (!String(newName || '').trim()) throw new Error('Hace falta un nombre.');
    if (/[\\/]/.test(newName)) throw new Error('El nombre no puede contener barras.');
    const conn = await liveConnection(connectionId);
    const parent = key.includes('/') ? `${key.slice(0, key.lastIndexOf('/'))}/` : '';
    return s3.renameObject(conn, bucket, key, `${parent}${newName.trim()}`);
  });

  handle('explorer:upload', async ({ connectionId, bucket, prefix } = {}) => {
    const conn = await liveConnection(connectionId);
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Subir al bucket',
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
        await s3.putFile(conn, bucket, `${prefix || ''}${name}`, file, guessType(name));
        results.uploaded += 1;
      } catch (err) {
        results.errors.push({ name, message: err.message });
      }
    }
    send('explorer:progress', { kind: 'upload', done: true });
    return results;
  });

  handle('explorer:download', async ({ connectionId, bucket, items } = {}) => {
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
        await s3.getObjectToFile(conn, bucket, item.key, path.join(target, safeName(item.name)));
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
