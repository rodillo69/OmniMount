'use strict';

/**
 * Automatic updates, from GitHub releases.
 *
 * The flow is driven from the interface rather than silently: the app checks,
 * says what it found and waits to be told to download and install. That is a
 * deliberate choice for this program, because installing means unmounting
 * every drive first, and doing that behind someone's back would interrupt
 * whatever they had open on them.
 */

const { autoUpdater } = require('electron-updater');
const log = require('./logger').scoped('updater');
const mounts = require('./mount-manager');

autoUpdater.logger = log;

// Ask before downloading. The installer is around 90 MB and the user may be
// on a metered connection.
autoUpdater.autoDownload = false;

// Never install from the quit handler. Windows kills detached processes
// during log off and shutdown, and an installer cut off halfway can leave
// the application uninstalled and not put back.
autoUpdater.autoInstallOnAppQuit = false;

// This project ships a plain NSIS installer, never a web one.
autoUpdater.disableWebInstaller = true;

let state = { status: 'idle', info: null, progress: null, error: null };
let notify = () => {};

function set(patch) {
  state = { ...state, ...patch };
  notify(state);
}

function register(send) {
  notify = (payload) => send('update:state', payload);

  autoUpdater.on('checking-for-update', () => set({ status: 'checking', error: null }));

  autoUpdater.on('update-available', (info) =>
    set({
      status: 'available',
      info: { version: info.version, notes: info.releaseNotes, date: info.releaseDate },
    })
  );

  autoUpdater.on('update-not-available', () => set({ status: 'current', info: null }));

  autoUpdater.on('download-progress', (p) =>
    set({
      status: 'downloading',
      progress: {
        percent: p.percent,
        transferred: p.transferred,
        total: p.total,
        bps: p.bytesPerSecond,
      },
    })
  );

  autoUpdater.on('update-downloaded', (event) =>
    set({ status: 'ready', info: { version: event.version }, progress: null })
  );

  autoUpdater.on('update-cancelled', () => set({ status: 'idle', progress: null }));

  autoUpdater.on('error', (err) => {
    log.error('Update failed:', err.message);
    set({ status: 'error', error: err.message, progress: null });
  });
}

/**
 * Look for a newer release.
 *
 * Returns the state rather than throwing: checkForUpdates both emits `error`
 * and re-throws, and an unhandled rejection here would reach the user as
 * nothing at all.
 */
async function check() {
  try {
    const result = await autoUpdater.checkForUpdates();
    // null means the app is not packaged, so there is nothing to update.
    if (result == null) set({ status: 'disabled' });
  } catch {
    // The 'error' event has already recorded the message.
  }
  return state;
}

async function download() {
  try {
    await autoUpdater.downloadUpdate();
  } catch {
    // Reported through the 'error' event.
  }
  return state;
}

/**
 * Unmount everything, then hand over to the installer.
 *
 * The order matters. The NSIS installer kills OmniMount.exe by name about a
 * second after it starts, and it does not touch the rclone processes behind
 * each drive. Unmounting afterwards would be cut off halfway, leaving rclone
 * orphaned with the drives still mapped and, worse, the write-back cache
 * never flushed.
 */
async function installNow() {
  set({ status: 'installing' });

  try {
    await mounts.shutdown();
  } catch (err) {
    log.error('Could not unmount before updating:', err.message);
  }

  // Tell the quit path the drives are already down, so it does not start a
  // second teardown while the installer is counting down.
  if (typeof module.exports.onBeforeInstall === 'function') {
    module.exports.onBeforeInstall();
  }

  // Silent, and relaunch when finished.
  autoUpdater.quitAndInstall(true, true);
}

module.exports = {
  register,
  check,
  download,
  installNow,
  getState: () => state,
  // Set by main.js so the quit handler knows not to unmount again.
  onBeforeInstall: null,
};
