'use strict';
const path = require('node:path');
const { app, BrowserWindow, nativeTheme, shell, dialog } = require('electron');

const paths = require('./paths');
const log = require('./logger').scoped('main');

// Windows needs this to group taskbar entries and show our own identity on
// notifications rather than "electron.app.Electron".
app.setAppUserModelId('io.github.rodillo69.omnimount');

// A second launch should surface the running window, not start a rival copy
// that would fight over drive letters.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

paths.ensureDirs();

const store = require('./store');
const ipc = require('./ipc');
const mounts = require('./mount-manager');
const tray = require('./tray');

const THEME_BARS = {
  dark: { color: '#0a0f3d', symbolColor: '#f6f4f1' },
  light: { color: '#ffffff', symbolColor: '#000a5a' },
};

let mainWindow = null;
let quitting = false;
const startedHidden = process.argv.includes('--minimized');

function barColours() {
  return nativeTheme.shouldUseDarkColors ? THEME_BARS.dark : THEME_BARS.light;
}

function createWindow() {
  const bar = barColours();

  mainWindow = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 940,
    minHeight: 640,
    show: false,
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#070b2e' : '#f6f4f1',
    title: 'OmniMount',
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    // The app paints its own header inside the title bar strip, so the window
    // controls are native but the chrome is ours.
    titleBarStyle: 'hidden',
    titleBarOverlay: { ...bar, height: 48 },
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    if (!startedHidden) mainWindow.show();
  });

  // Closing the window parks the app in the tray so the drives keep working;
  // only an explicit Quit tears the mounts down.
  mainWindow.on('close', (event) => {
    if (quitting) return;
    if (store.getSettings().closeToTray) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // External links belong in the user's browser, never in an app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  // Errores de la interfaz al registro de la aplicación: sin esto, un fallo
  // en el renderer sólo se ve abriendo las DevTools.
  mainWindow.webContents.on('console-message', (event) => {
    if (event.level === 'error' || event.level === 'warning') {
      log.error(`[renderer] ${event.message} (${event.sourceId}:${event.lineNumber})`);
    }
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    log.error('El proceso de la interfaz se cerró:', details.reason);
  });

  if (process.argv.includes('--dev')) mainWindow.webContents.openDevTools({ mode: 'detach' });

  ipc.setWindow(mainWindow);
  return mainWindow;
}

function showWindow() {
  if (!mainWindow) {
    createWindow();
    mainWindow.once('ready-to-show', () => mainWindow.show());
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function navigate(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ui:navigate', payload);
  }
}

async function quitApp() {
  if (quitting) return;
  quitting = true;
  try {
    await mounts.shutdown();
  } catch (err) {
    log.error('Fallo al desmontar durante la salida:', err.message);
  }
  tray.destroy();
  app.quit();
}

app.on('second-instance', () => showWindow());

app.whenReady().then(async () => {
  store.load();
  const settings = store.getSettings();
  nativeTheme.themeSource = settings.theme || 'system';

  ipc.register();
  ipc.wireMountEvents();

  createWindow();

  tray.create({
    onShow: showWindow,
    onQuit: () => {
      quitApp();
    },
    onNavigate: navigate,
  });

  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setTitleBarOverlay({ ...barColours(), height: 48 });
    }
  });

  // Mantiene el elemento de inicio al día por si se cambió desde la
  // configuración de Windows.
  ipc.applyLoginItem();

  if (settings.mountOnStart) {
    const auto = store.listMounts().filter((m) => m.autoMount);
    if (auto.length) {
      // Se espera a que la interfaz esté cargada: los avisos de cambio de
      // estado se envían por IPC y, si todavía no hay nadie escuchando, se
      // pierden y la tarjeta se queda colgada en "Montando".
      const start = () => {
        log.info(`Montando ${auto.length} unidad(es) marcadas como automáticas.`);
        mounts.mountAll(auto.map((m) => m.id)).then((results) => {
          const failed = results.filter((r) => !r.ok);
          if (failed.length) log.warn('Montajes automáticos fallidos:', failed);
        });
      };

      if (mainWindow && !mainWindow.webContents.isLoading()) start();
      else if (mainWindow) mainWindow.webContents.once('did-finish-load', start);
      else start();
    }
  }
});

// With a tray icon present, no windows open is a normal state on Windows.
app.on('window-all-closed', () => {});

app.on('before-quit', (event) => {
  if (quitting) return;
  event.preventDefault();
  quitApp();
});

process.on('uncaughtException', (err) => {
  log.error('Excepcion no capturada:', err);
  if (app.isReady()) {
    dialog.showErrorBox(
      'OmniMount',
      `Se ha producido un error inesperado:\n\n${err.message}\n\nEl registro esta en:\n${paths.appLog}`
    );
  }
});

process.on('unhandledRejection', (reason) => {
  log.error('Promesa rechazada sin gestionar:', reason);
});
