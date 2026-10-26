'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { safeStorage } = require('electron');
const { configFile, dirs } = require('./paths');
const log = require('./logger').scoped('store');

const CONFIG_VERSION = 3;

const DEFAULTS = {
  version: CONFIG_VERSION,
  settings: {
    theme: 'system',
    // La unidad tiene que sobrevivir a un reinicio: para eso la aplicación
    // arranca con Windows, en segundo plano, y monta lo marcado como
    // automático.
    autostart: true,
    startMinimized: true,
    mountOnStart: true,
    closeToTray: true,
    confirmUnmount: true,
  },
  connections: [],
  mounts: [],
};

let state = null;

/* ---------------------------------------------------------------- secrets */

// Los secretos se sellan con DPAPI a través de safeStorage, así que el fichero
// de configuración sólo es legible por este usuario de Windows en este equipo.
// Si el almacén del sistema no está disponible, no se guarda nada en claro.
//
// Se usa la API asíncrona: la síncrona está obsoleta en Electron 45 y
// desaparecerá. Ojo, decryptStringAsync devuelve {shouldReEncrypt, result},
// no una cadena.
async function encryptionAvailable() {
  try {
    return await safeStorage.isAsyncEncryptionAvailable();
  } catch {
    return false;
  }
}

async function sealSecret(plain) {
  if (!plain) return null;
  if (!(await encryptionAvailable())) {
    throw new Error('El cifrado de Windows no está disponible, no se puede guardar la clave secreta.');
  }
  const encrypted = await safeStorage.encryptStringAsync(plain);
  return { v: 2, enc: Buffer.from(encrypted).toString('base64') };
}

async function openSecret(sealed) {
  if (!sealed || !sealed.enc) return { value: '', shouldReEncrypt: false };
  try {
    const out = await safeStorage.decryptStringAsync(Buffer.from(sealed.enc, 'base64'));
    // Si la clave del sistema ha rotado, el blob sigue siendo legible pero
    // conviene volver a sellarlo con la nueva.
    return { value: out.result, shouldReEncrypt: Boolean(out.shouldReEncrypt) };
  } catch (err) {
    log.error('No se pudo descifrar una clave secreta:', err);
    return { value: '', shouldReEncrypt: false };
  }
}

/* ----------------------------------------------------------- persistence */

function load() {
  try {
    const raw = fs.readFileSync(configFile, 'utf8');
    const parsed = JSON.parse(raw);
    state = {
      ...DEFAULTS,
      ...parsed,
      settings: { ...DEFAULTS.settings, ...(parsed.settings || {}) },
      connections: Array.isArray(parsed.connections) ? parsed.connections : [],
      mounts: Array.isArray(parsed.mounts) ? parsed.mounts : [],
    };
  } catch (err) {
    if (err.code !== 'ENOENT') log.error('Config ilegible, se parte de cero:', err);
    state = structuredClone(DEFAULTS);
  }
  // Ajustes de versiones anteriores que ya no existen. El endpoint y los
  // parámetros del motor son parte del servicio, no preferencias: dejarlos
  // sueltos en el fichero sólo invita a tocarlos.
  delete state.settings.endpointOverride;
  delete state.settings.rcloneExtraFlags;

  migrate();
  return state;
}

/**
 * Pone al día una configuración de una versión anterior. Hoy sólo hay un paso:
 * las unidades dejaron de montarse en modo red, porque el Explorador les
 * añadía un sufijo con la ruta de red que no hay manera de quitar.
 */
function migrate() {
  if (state.version >= CONFIG_VERSION) return;

  for (const mount of state.mounts) {
    mount.networkMode = false;
    if (mount.reportedSizeTB === undefined) mount.reportedSizeTB = 1;
  }

  // La persistencia tras reiniciar llega en esta versión: quien ya tuviera
  // unidades las quiere de vuelta al encender, no tener que ir a buscarlas.
  if (state.mounts.length) {
    state.settings.autostart = true;
    state.settings.startMinimized = true;
    state.settings.mountOnStart = true;
    for (const mount of state.mounts) mount.autoMount = true;
  }

  // v3 generalises a connection from "an S3 account" to "any rclone backend".
  // The old shape kept endpoint and keys as top-level fields; they move into
  // `config` under the names rclone itself uses.
  for (const conn of state.connections) {
    if (conn.config) continue;
    conn.type = 's3';
    conn.config = {
      provider: 'Other',
      endpoint: conn.endpoint,
      region: conn.region || 'us-east-1',
      access_key_id: conn.accessKeyId,
      force_path_style: conn.forcePathStyle !== false ? 'true' : 'false',
      no_check_bucket: conn.noCheckBucket !== false ? 'true' : 'false',
    };
    conn.secrets = conn.secret ? { secret_access_key: conn.secret } : {};
    conn.obscuredFields = [];
    delete conn.secret;
    delete conn.accessKeyId;
    delete conn.forcePathStyle;
    delete conn.noCheckBucket;
  }

  // Mounts named their root `bucket`; backends call it other things.
  for (const mount of state.mounts) {
    if (mount.root === undefined) mount.root = mount.bucket || '';
  }

  state.version = CONFIG_VERSION;

  try {
    save();
    log.info(`Configuración migrada a la versión ${CONFIG_VERSION}.`);
  } catch (err) {
    log.warn('No se pudo guardar la configuración migrada:', err.message);
  }
}

function save() {
  // Write to a sibling temp file and rename, so a crash mid-write cannot
  // leave a truncated config behind.
  const tmp = path.join(dirs.temp, `config.${process.pid}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  fs.renameSync(tmp, configFile);
}

function get() {
  if (!state) load();
  return state;
}

/* ------------------------------------------------------------- settings */

function getSettings() {
  return { ...get().settings };
}

function updateSettings(patch) {
  get().settings = { ...get().settings, ...patch };
  save();
  return getSettings();
}

/* ---------------------------------------------------------- connections */

// A connection is an S3 account: endpoint plus credentials. Mounts reference
// one by id so several drives can share a single set of keys.
function publicConnection(conn) {
  const { secrets, ...rest } = conn;
  const names = Object.keys(secrets || {});
  return {
    ...rest,
    // Never the values, only which fields hold one and whether it is readable.
    secretFields: names,
    hasSecret: names.length > 0 && names.every((k) => secrets[k] && secrets[k].enc),
    needsSecret: names.length > 0,
  };
}

function listConnections() {
  return get().connections.map(publicConnection);
}

/**
 * A connection with its secrets decrypted, ready to hand to rclone.
 *
 * The result merges the stored secrets back into `config` under their rclone
 * field names, so the caller never has to know which fields were encrypted.
 */
async function getConnectionSecret(id) {
  const conn = get().connections.find((c) => c.id === id);
  if (!conn) return null;

  const config = { ...(conn.config || {}) };
  let resealed = false;

  for (const [field, blob] of Object.entries(conn.secrets || {})) {
    const opened = await openSecret(blob);
    if (opened.value) config[field] = opened.value;

    // The OS key can be rotated underneath us; re-seal when it says so.
    if (opened.shouldReEncrypt && opened.value) {
      try {
        conn.secrets[field] = await sealSecret(opened.value);
        resealed = true;
      } catch (err) {
        log.warn(`Could not re-seal ${field}:`, err.message);
      }
    }
  }

  if (resealed) {
    try {
      save();
      log.info('Credentials re-sealed after the system key rotated.');
    } catch (err) {
      log.warn('Could not save re-sealed credentials:', err.message);
    }
  }

  return { ...publicConnection(conn), config };
}

/**
 * Create or update a connection.
 *
 * `config` holds plain values under rclone's own field names, `secrets` the
 * ones to encrypt under those same names. Keeping rclone's vocabulary end to
 * end means a new backend needs no change here: whatever the catalogue says
 * its fields are called is what gets stored and what rclone later reads.
 */
async function saveConnection(input) {
  const conns = get().connections;
  const existing = input.id ? conns.find((c) => c.id === input.id) : null;

  const record = {
    id: existing ? existing.id : `conn_${crypto.randomUUID()}`,
    name: (input.name || '').trim() || 'Unnamed connection',
    type: input.type || (existing ? existing.type : 's3'),
    config: { ...(input.config || {}) },
    // Field names rclone needs stored obscured rather than in clear text.
    obscuredFields: input.obscuredFields || (existing ? existing.obscuredFields : []) || [],
    secrets: existing ? { ...existing.secrets } : {},
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // An omitted secret on an edit means "keep the stored one"; an empty string
  // means "remove it".
  for (const [field, value] of Object.entries(input.secrets || {})) {
    if (value === undefined) continue;
    if (value === '') delete record.secrets[field];
    else record.secrets[field] = await sealSecret(value);
  }

  if (existing) conns[conns.indexOf(existing)] = record;
  else conns.push(record);

  save();
  return publicConnection(record);
}

function normaliseEndpoint(value) {
  let endpoint = (value || '').trim();
  if (!endpoint) return '';
  if (!/^https?:\/\//i.test(endpoint)) endpoint = `https://${endpoint}`;
  return endpoint.replace(/\/+$/, '');
}

/* --------------------------------------------------------------- mounts */

function listMounts() {
  return get().mounts.map((m) => ({ ...m }));
}

function getMount(id) {
  const mount = get().mounts.find((m) => m.id === id);
  return mount ? { ...mount } : null;
}

function saveMount(input) {
  const mounts = get().mounts;
  const existing = input.id ? mounts.find((m) => m.id === input.id) : null;

  const letter = String(input.driveLetter || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 1);
  if (!letter) throw new Error('Hace falta una letra de unidad.');

  const clash = mounts.find(
    (m) => m.driveLetter === letter && m.id !== (existing ? existing.id : null)
  );
  if (clash) throw new Error(`La letra ${letter}: ya la usa la unidad "${clash.name}".`);

  if (!input.connectionId || !get().connections.some((c) => c.id === input.connectionId)) {
    throw new Error('La conexion indicada no existe.');
  }
  if (!String(input.bucket || '').trim()) throw new Error('Hace falta un bucket.');

  const record = {
    id: existing ? existing.id : `mnt_${crypto.randomUUID()}`,
    name: (input.name || '').trim() || `Unidad ${letter}`,
    connectionId: input.connectionId,
    bucket: String(input.bucket).trim().replace(/^\/+|\/+$/g, ''),
    prefix: String(input.prefix || '').trim().replace(/^\/+|\/+$/g, ''),
    driveLetter: letter,
    volumeLabel: (input.volumeLabel || '').trim() || (input.name || `Drive ${letter}`).trim(),
    readOnly: Boolean(input.readOnly),
    // Por defecto NO. Montar en modo red deja una entrada cacheada en el
    // Explorador que luego aparece con una cruz roja aunque la unidad ya no
    // exista, y ensucia "Este equipo" hasta que se borra del registro.
    networkMode: input.networkMode === true,
    cacheMode: ['off', 'minimal', 'writes', 'full'].includes(input.cacheMode)
      ? input.cacheMode
      : 'full',
    cacheMaxSizeGB: clampNumber(input.cacheMaxSizeGB, 1, 2048, 10),
    cacheMaxAgeHours: clampNumber(input.cacheMaxAgeHours, 1, 8760, 24),
    dirCacheSeconds: clampNumber(input.dirCacheSeconds, 1, 86400, 30),
    transfers: clampNumber(input.transfers, 1, 64, 8),
    checkers: clampNumber(input.checkers, 1, 64, 8),
    bandwidthLimit: (input.bandwidthLimit || '').trim(),
    reportedSizeTB: clampNumber(input.reportedSizeTB, 0, 1024, 1),
    autoMount: Boolean(input.autoMount),
    autoRestart: input.autoRestart !== false,
    extraFlags: (input.extraFlags || '').trim(),
    createdAt: existing ? existing.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existing) mounts[mounts.indexOf(existing)] = record;
  else mounts.push(record);

  save();
  return { ...record };
}

function deleteMount(id) {
  const data = get();
  data.mounts = data.mounts.filter((m) => m.id !== id);
  save();
}

function clampNumber(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

module.exports = {
  load,
  save,
  get,
  getSettings,
  updateSettings,
  listConnections,
  getConnectionSecret,
  saveConnection,
  deleteConnection,
  listMounts,
  getMount,
  saveMount,
  deleteMount,
  encryptionAvailable,
  normaliseEndpoint,
};
