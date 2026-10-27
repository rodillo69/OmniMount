'use strict';

// Sent when fetching rclone releases; GitHub rejects requests without one.
const USER_AGENT = `OmniMount/${require('../../package.json').version}`;
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const { app } = require('electron');
const { execFile } = require('node:child_process');
const { dirs, rcloneExe } = require('./paths');
const elevation = require('./elevation');
const log = require('./logger').scoped('deps');

// Los dos componentes viajan dentro del instalador, así que el primer arranque
// no necesita red. Las descargas son sólo el plan B si alguien ejecuta la app
// desde el código fuente sin haberlos preparado.
const WINFSP_FALLBACK = {
  version: '2.1.25156',
  url: 'https://github.com/winfsp/winfsp/releases/download/v2.1/winfsp-2.1.25156.msi',
};
const RCLONE_URL = 'https://downloads.rclone.org/rclone-current-windows-amd64.zip';
const WINFSP_BIN_CANDIDATES = [
  'C:\\Program Files (x86)\\WinFsp\\bin',
  'C:\\Program Files\\WinFsp\\bin',
];
const WINFSP_DLL_CANDIDATES = WINFSP_BIN_CANDIDATES.map((dir) =>
  path.join(dir, 'winfsp-x64.dll')
);

/** Carpeta con los binarios empaquetados, dentro o fuera del .exe instalado. */
function vendorDir() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'vendor')
    : path.join(__dirname, '..', '..', 'build', 'vendor');
}

function bundled(name) {
  const file = path.join(vendorDir(), name);
  try {
    return fs.existsSync(file) ? file : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------- detección */

function registryQuery(key, value) {
  return new Promise((resolve) => {
    execFile('reg.exe', ['query', key, '/v', value], { timeout: 5000, windowsHide: true },
      (err, stdout) => {
        if (err) return resolve(null);
        const match = new RegExp(`${value}\\s+REG_\\w+\\s+(.+)`, 'i').exec(String(stdout));
        resolve(match ? match[1].trim() : null);
      });
  });
}

function existsQuietly(candidate) {
  try {
    return fs.existsSync(candidate);
  } catch {
    return false;
  }
}

/**
 * Ask the driver itself whether it is loaded.
 *
 * Files on disk and a registry key only prove that an installer ran. The
 * kernel driver is a separate thing, registered under a side-by-side name
 * that carries a build timestamp (WinFsp+20261023T124309Z on this machine), so
 * there is no fixed service name to query. `fsptool lsvol` asks the driver to
 * list its volumes, which it can only answer if it is actually loaded, and
 * needs no privileges to do it.
 *
 * This is the difference between "WinFsp is installed" and "mounting will
 * work" — and it is the gap a freshly installed driver awaiting a reboot falls
 * into.
 */
function driverResponds(fsptool) {
  return new Promise((resolve) => {
    execFile(fsptool, ['lsvol'], { timeout: 10000, windowsHide: true }, (err) =>
      resolve(!err)
    );
  });
}

async function checkWinFsp() {
  const dll = WINFSP_DLL_CANDIDATES.find(existsQuietly);

  const version =
    (await registryQuery('HKLM\\SOFTWARE\\WOW6432Node\\WinFsp', 'Version')) ||
    (await registryQuery('HKLM\\SOFTWARE\\WinFsp', 'Version'));
  const installDir =
    (await registryQuery('HKLM\\SOFTWARE\\WOW6432Node\\WinFsp', 'InstallDir')) ||
    (await registryQuery('HKLM\\SOFTWARE\\WinFsp', 'InstallDir'));

  const installed = Boolean(dll) || Boolean(version) || Boolean(installDir);

  const fsptool = [
    ...(installDir ? [path.join(installDir, 'bin', 'fsptool-x64.exe')] : []),
    ...WINFSP_BIN_CANDIDATES.map((dir) => path.join(dir, 'fsptool-x64.exe')),
  ].find(existsQuietly);

  // With no way to ask, the files are the best evidence available. Reporting
  // "not ready" on a missing tool would block a working machine over a
  // question we simply could not put.
  const ready = installed && (fsptool ? await driverResponds(fsptool) : true);

  return {
    id: 'winfsp',
    name: 'Controlador de unidad',
    technicalName: 'WinFsp',
    installed,
    ready,
    version: version || (installed ? 'instalado' : null),
    path: dll || installDir || null,
    requiresAdmin: true,
    description: 'Permite que el almacenamiento aparezca como una unidad real en el Explorador.',
  };
}

function rcloneVersion(exe) {
  return new Promise((resolve) => {
    execFile(exe, ['version'], { timeout: 10000, windowsHide: true }, (err, stdout) => {
      if (err) return resolve(null);
      const match = /rclone\s+v([\d.]+)/i.exec(String(stdout));
      resolve(match ? match[1] : 'instalado');
    });
  });
}

async function checkRclone() {
  let exe = null;
  if (fs.existsSync(rcloneExe)) exe = rcloneExe;
  let version = exe ? await rcloneVersion(exe) : null;

  return {
    id: 'rclone',
    name: 'Motor de transferencia',
    technicalName: 'rclone',
    installed: Boolean(version),
    version,
    path: exe,
    requiresAdmin: false,
    description: 'Conecta con el almacenamiento remoto y sirve los ficheros a la unidad.',
  };
}

async function checkAll() {
  const [winfsp, rclone] = await Promise.all([checkWinFsp(), checkRclone()]);
  // `ready` gates mounting, so it follows the driver actually answering rather
  // than its files being present. The two differ exactly when a reboot is
  // still pending, which is when mounting would fail.
  return { winfsp, rclone, ready: winfsp.ready && rclone.installed };
}

/* ------------------------------------------------------------ descargas */

function download(url, destination, onProgress, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': USER_AGENT }, timeout: 60000 },
      (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
          res.resume();
          if (redirectsLeft <= 0) return reject(new Error('Demasiadas redirecciones.'));
          return download(res.headers.location, destination, onProgress, redirectsLeft - 1)
            .then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`La descarga devolvio HTTP ${res.statusCode}.`));
        }

        const total = Number(res.headers['content-length'] || 0);
        let received = 0;
        const out = fs.createWriteStream(destination);
        res.on('data', (chunk) => {
          received += chunk.length;
          if (onProgress) {
            onProgress({ received, total, percent: total ? Math.round((received / total) * 100) : null });
          }
        });
        res.pipe(out);
        out.on('finish', () => out.close(() => resolve({ path: destination, bytes: received })));
        out.on('error', reject);
        res.on('error', reject);
      });
    req.on('timeout', () => req.destroy(new Error('Tiempo de espera agotado en la descarga.')));
    req.on('error', reject);
  });
}

/**
 * Expand-Archive depende de un módulo de PowerShell que no está disponible en
 * todas las instalaciones, así que se usa la clase de .NET, que sí lo está.
 */
function unzip(zipPath, destination) {
  return new Promise((resolve, reject) => {
    const script =
      "Add-Type -AssemblyName System.IO.Compression.FileSystem; " +
      `[System.IO.Compression.ZipFile]::ExtractToDirectory('${zipPath}','${destination}')`;
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 180000, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (err, _stdout, stderr) => {
        if (err) return reject(new Error(String(stderr || err.message).trim()));
        resolve(destination);
      }
    );
  });
}

/* ------------------------------------------------------------ instalación */

async function installRclone(onProgress) {
  fs.mkdirSync(dirs.bin, { recursive: true });
  fs.mkdirSync(dirs.temp, { recursive: true });
  const report = (stage, detail) => onProgress && onProgress({ id: 'rclone', stage, ...detail });

  const packaged = bundled('rclone.exe');
  if (packaged) {
    report('install', { message: 'Preparando el motor de transferencia...', percent: 50 });
    fs.copyFileSync(packaged, rcloneExe);
  } else {
    const zip = path.join(dirs.temp, 'rclone.zip');
    const extractDir = path.join(dirs.temp, 'rclone-extract');

    report('download', { message: 'Descargando el motor de transferencia...', percent: 0 });
    await download(RCLONE_URL, zip, (p) =>
      report('download', {
        message: 'Descargando el motor de transferencia...',
        percent: p.percent,
        received: p.received,
        total: p.total,
      })
    );

    report('install', { message: 'Instalando...', percent: null });
    fs.rmSync(extractDir, { recursive: true, force: true });
    await unzip(zip, extractDir);

    const found = findFile(extractDir, 'rclone.exe');
    if (!found) throw new Error('El archivo descargado no contenia rclone.exe.');
    fs.copyFileSync(found, rcloneExe);
    fs.rmSync(zip, { force: true });
    fs.rmSync(extractDir, { recursive: true, force: true });
  }

  const version = await rcloneVersion(rcloneExe);
  if (!version) throw new Error('El motor de transferencia se copio pero no responde.');
  log.info('rclone instalado, version', version);
  report('done', { message: 'Motor de transferencia listo.', percent: 100 });
  return { installed: true, version, path: rcloneExe };
}

function findFile(root, filename, depth = 0) {
  if (depth > 4) return null;
  let entries;
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (entry.isFile() && entry.name.toLowerCase() === filename.toLowerCase()) {
      return path.join(root, entry.name);
    }
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const nested = findFile(path.join(root, entry.name), filename, depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}

async function resolveWinFspRelease() {
  try {
    const body = await new Promise((resolve, reject) => {
      const req = https.get(
        'https://api.github.com/repos/winfsp/winfsp/releases/latest',
        { headers: { 'User-Agent': USER_AGENT, Accept: 'application/vnd.github+json' }, timeout: 15000 },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
          res.on('error', reject);
        }
      );
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', reject);
    });
    const release = JSON.parse(body);
    const asset = (release.assets || []).find((a) => /^winfsp-[\d.]+\.msi$/i.test(a.name));
    if (asset) return { version: release.tag_name, url: asset.browser_download_url, name: asset.name };
  } catch (err) {
    log.warn('No se pudo consultar la release de WinFsp, se usa la fijada:', err.message);
  }
  return { ...WINFSP_FALLBACK, name: `winfsp-${WINFSP_FALLBACK.version}.msi` };
}

/**
 * Instala un MSI con permisos de administrador. Devuelve el código de salida
 * del instalador, o la cadena 'declined' si el usuario rechaza el aviso de UAC
 * (en ese caso Start-Process lanza una excepción en vez de devolver código).
 */
function runElevatedMsi(msiPath) {
  return new Promise((resolve, reject) => {
    const script = [
      '$ErrorActionPreference = "Stop";',
      'try {',
      '  $p = Start-Process msiexec.exe',
      `    -ArgumentList '/i','"${msiPath}"','/qn','/norestart'`,
      '    -Verb RunAs -Wait -PassThru;',
      '  Write-Output ("EXIT:" + $p.ExitCode)',
      '} catch {',
      '  Write-Output "EXIT:DECLINED"',
      '}',
    ].join(' ');

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: 300000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
      (err, stdout, stderr) => {
        const output = String(stdout || '');
        const match = /EXIT:(\w+)/.exec(output);
        if (!match) {
          return reject(new Error(String(stderr || err?.message || 'El instalador no respondió.').trim()));
        }
        resolve(match[1] === 'DECLINED' ? 'declined' : Number(match[1]));
      }
    );
  });
}

async function installWinFsp(onProgress) {
  fs.mkdirSync(dirs.temp, { recursive: true });
  const report = (stage, detail) => onProgress && onProgress({ id: 'winfsp', stage, ...detail });

  let msi = bundled('winfsp.msi');
  let temporary = false;

  if (!msi) {
    report('resolve', { message: 'Localizando el controlador...', percent: null });
    const release = await resolveWinFspRelease();
    msi = path.join(dirs.temp, release.name);
    temporary = true;
    report('download', { message: 'Descargando el controlador de unidad...', percent: 0 });
    await download(release.url, msi, (p) =>
      report('download', {
        message: 'Descargando el controlador de unidad...',
        percent: p.percent,
        received: p.received,
        total: p.total,
      })
    );
  }

  report('install', {
    message: 'Instalando el controlador. Windows pedira confirmacion.',
    percent: null,
    needsElevation: true,
  });

  // Hay que elevar de forma explícita: lanzar msiexec sin más desde un
  // proceso normal no consigue mostrar el aviso de UAC y falla con 1603.
  // Start-Process -Verb RunAs sí lo pide, y -Wait permite leer el resultado.
  const code = await runElevatedMsi(msi);

  // El MSI sólo se borra si la instalación salió bien. Si falló, es lo único
  // que un administrador necesita para arreglarlo a mano, y borrarlo obligaría
  // a descargarlo otra vez desde una sesión que quizá no tiene red.
  const cleanUp = () => {
    if (temporary) fs.rmSync(msi, { force: true });
  };

  if (code === 'declined' || code === 1602) {
    const state = await elevation.read();
    const err = new Error(
      state.canElevate
        ? 'No se autorizó la instalación del controlador. Hay que aceptar el aviso de Windows para poder crear unidades.'
        : 'Esta cuenta no puede instalar el controlador: Windows pide credenciales de administrador. Tiene que instalarlo una vez quien administre el equipo.'
    );
    err.userDeclined = true;
    err.code = state.canElevate ? 'UAC_DECLINED' : 'NEEDS_ADMIN';
    err.installerPath = msi;
    throw err;
  }
  if (code !== 0 && code !== 3010) {
    const err = new Error(`El instalador del controlador terminó con el código ${code}.`);
    err.installerPath = msi;
    throw err;
  }

  const status = await checkWinFsp();
  if (!status.installed) {
    const err = new Error(
      'El controlador dice haberse instalado pero no se detecta. Reinicia el equipo.'
    );
    err.installerPath = msi;
    throw err;
  }

  cleanUp();

  // Instalado pero sin responder: el driver se carga al reiniciar. Montar
  // ahora fallaría, así que se dice aquí y no después, con la unidad a medias.
  const needsReboot = code === 3010 || !status.ready;
  log.info('WinFsp instalado, version', status.version, needsReboot ? '(pendiente de reinicio)' : '');
  report('done', { message: 'Controlador listo.', percent: 100, needsReboot });
  return { ...status, needsReboot };
}

/**
 * Deja el equipo listo sin intervención: instala lo que falte en el orden que
 * menos interrumpe (primero lo que no pide permisos) y devuelve el estado.
 */
async function ensureAll(onProgress) {
  const report = (payload) => onProgress && onProgress(payload);
  let status = await checkAll();

  if (status.ready) {
    report({ id: 'all', stage: 'done', message: 'Todo listo.', percent: 100 });
    return { ...status, installed: [], needsReboot: false };
  }

  const installed = [];
  let needsReboot = false;

  const pending = [];
  if (!status.rclone.installed) pending.push('rclone');
  // Un controlador ya instalado que no responde no se arregla reinstalándolo:
  // le falta el reinicio que carga el driver. Volver a pasar el MSI sólo
  // gastaría otro aviso de UAC para acabar igual.
  if (!status.winfsp.installed) pending.push('winfsp');
  else if (!status.winfsp.ready) needsReboot = true;

  let index = 0;
  for (const id of pending) {
    index += 1;
    report({ id, stage: 'start', step: index, steps: pending.length });
    const result =
      id === 'rclone' ? await installRclone(onProgress) : await installWinFsp(onProgress);
    if (result && result.needsReboot) needsReboot = true;
    installed.push(id);
  }

  status = await checkAll();
  report({ id: 'all', stage: 'done', message: 'Todo listo.', percent: 100 });
  return { ...status, installed, needsReboot };
}

module.exports = {
  checkAll,
  checkWinFsp,
  checkRclone,
  installRclone,
  installWinFsp,
  ensureAll,
  rcloneVersion,
};
