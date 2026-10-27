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
const store = require('./store');

// How often to look, once the application is running. An hour is often
// enough that a fix reaches people the day it ships, and rare enough that
// nobody notices the request.
const EVERY = 60 * 60 * 1000;

// What "remind me later" buys. Long enough to finish what you were doing,
// short enough that the update is not forgotten for a week.
const SNOOZE = 4 * 60 * 60 * 1000;

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
let announce = () => {};
let timer = null;

// Set while a check was asked for from the interface. A check the user
// started reports back even when the notice is switched off or this version
// was skipped: they asked, so they get an answer.
let asked = false;

function set(patch) {
  state = { ...state, ...patch };
  notify(state);
}

/**
 * Should a version that was just found announce itself?
 *
 * Three ways to say no, and they mean different things. The notice can be
 * switched off for good; one particular version can be dismissed for good;
 * and "later" quiets every version for a few hours. A check the user started
 * by hand ignores all three, because it is an answer to a question they just
 * asked rather than an interruption.
 */
function shouldAnnounce(version) {
  if (asked) return true;

  const settings = store.getSettings();
  if (settings.updateNotify === false) return false;
  if (settings.updateSkipVersion && settings.updateSkipVersion === version) return false;
  if (Number(settings.updateSnoozedUntil) > Date.now()) return false;
  return true;
}

/** Stop asking about this version. A later one is a different question. */
function skip(version) {
  if (version) store.updateSettings({ updateSkipVersion: String(version) });
  return store.getSettings();
}

/** Quiet every version for a few hours. */
function snooze() {
  store.updateSettings({ updateSnoozedUntil: Date.now() + SNOOZE });
  return store.getSettings();
}

function register(send) {
  notify = (payload) => send('update:state', payload);
  announce = (payload) => send('update:announce', payload);

  autoUpdater.on('checking-for-update', () => set({ status: 'checking', error: null }));

  autoUpdater.on('update-available', (info) => {
    const found = { version: info.version, notes: info.releaseNotes, date: info.releaseDate };
    set({ status: 'available', info: found });
    if (!shouldAnnounce(info.version)) return;
    // The window first, then the notice: drawing it into a hidden window is
    // the same as not showing it at all.
    if (typeof module.exports.onAnnounce === 'function') module.exports.onAnnounce(found);
    announce(found);
  });

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
async function check(options = {}) {
  // A check the user started answers back whatever the settings say.
  asked = options.manual === true;
  try {
    const result = await autoUpdater.checkForUpdates();
    // null means the app is not packaged, so there is nothing to update.
    if (result == null) set({ status: 'disabled' });
  } catch {
    // The 'error' event has already recorded the message.
  } finally {
    asked = false;
  }
  return state;
}

/**
 * Check now, and then every hour for as long as the application runs.
 *
 * The first check is deferred by the caller rather than here: the window has
 * to be listening before the answer arrives, or it is sent to nobody and the
 * notice never appears.
 */
function startSchedule() {
  if (timer) return;
  timer = setInterval(() => {
    // Nothing to announce while an update is already on its way down or
    // waiting to be installed, and re-checking would reset that.
    if (['downloading', 'ready', 'installing'].includes(state.status)) return;
    check().catch(() => {});
  }, EVERY);
  // An hourly timer is no reason to keep the process alive on its own.
  if (typeof timer.unref === 'function') timer.unref();
}

function stopSchedule() {
  if (timer) clearInterval(timer);
  timer = null;
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
  startSchedule,
  stopSchedule,
  skip,
  snooze,
  getState: () => state,
  // Set by main.js so the quit handler knows not to unmount again.
  onBeforeInstall: null,
  // Set by main.js: brings the window up before a notice is drawn in it.
  onAnnounce: null,
};
