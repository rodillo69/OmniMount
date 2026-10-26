'use strict';
const path = require('node:path');
const { Tray, Menu, nativeImage, app } = require('electron');
const store = require('./store');
const mounts = require('./mount-manager');
const log = require('./logger').scoped('tray');

const ICON = path.join(__dirname, '..', 'renderer', 'assets', 'icon.png');

let tray = null;
let onShow = null;
let onQuit = null;
let onNavigate = null;

const STATE_LABEL = {
  mounted: 'conectada',
  mounting: 'conectando',
  unmounting: 'desconectando',
  unmounted: 'desconectada',
  error: 'error',
};

function build() {
  const list = store.listMounts();

  const mountItems = list.length
    ? list.map((mount) => {
        const state = mounts.status(mount.id).state;
        const busy = state === 'mounting' || state === 'unmounting';
        const isMounted = state === 'mounted';
        return {
          label: `${mount.driveLetter}:  ${mount.name}  (${STATE_LABEL[state] || state})`,
          submenu: [
            {
              label: 'Montar',
              enabled: !isMounted && !busy,
              click: () => mounts.mount(mount.id).catch((err) => log.warn(err.message)),
            },
            {
              label: 'Desmontar',
              enabled: isMounted && !busy,
              click: () => mounts.unmount(mount.id).catch((err) => log.warn(err.message)),
            },
            {
              label: 'Abrir en el Explorador',
              enabled: isMounted,
              click: () => {
                const { shell } = require('electron');
                shell.openPath(`${mount.driveLetter}:\\`);
              },
            },
            { type: 'separator' },
            {
              label: 'Ver detalles',
              click: () => {
                if (onShow) onShow();
                if (onNavigate) onNavigate({ view: 'mount', id: mount.id });
              },
            },
          ],
        };
      })
    : [{ label: 'No hay unidades configuradas', enabled: false }];

  const anyMounted = list.some((m) => mounts.status(m.id).state === 'mounted');
  const anyUnmounted = list.some((m) => mounts.status(m.id).state !== 'mounted');

  return Menu.buildFromTemplate([
    { label: 'OmniMount', enabled: false },
    { type: 'separator' },
    ...mountItems,
    { type: 'separator' },
    {
      label: 'Montar todas',
      enabled: anyUnmounted,
      click: () => mounts.mountAll(list.map((m) => m.id)).catch((err) => log.warn(err.message)),
    },
    {
      label: 'Desmontar todas',
      enabled: anyMounted,
      click: () => mounts.unmountAll().catch((err) => log.warn(err.message)),
    },
    { type: 'separator' },
    { label: 'Abrir OmniMount', click: () => onShow && onShow() },
    {
      label: 'Nueva unidad',
      click: () => {
        if (onShow) onShow();
        if (onNavigate) onNavigate({ view: 'wizard' });
      },
    },
    { type: 'separator' },
    { label: 'Salir', click: () => onQuit && onQuit() },
  ]);
}

function refresh() {
  if (!tray) return;
  tray.setContextMenu(build());

  const list = store.listMounts();
  const mounted = list.filter((m) => mounts.status(m.id).state === 'mounted');
  const errored = list.filter((m) => mounts.status(m.id).state === 'error');

  let tip = 'OmniMount';
  if (mounted.length) {
    tip += ` - ${mounted.length} unidad${mounted.length === 1 ? '' : 'es'} conectada${mounted.length === 1 ? '' : 's'}`;
  }
  if (errored.length) tip += ` - ${errored.length} con error`;
  tray.setToolTip(tip);
}

function create(handlers = {}) {
  onShow = handlers.onShow;
  onQuit = handlers.onQuit;
  onNavigate = handlers.onNavigate;

  let image = nativeImage.createFromPath(ICON);
  if (image.isEmpty()) {
    log.warn('No se pudo cargar el icono de la bandeja, se usa el del ejecutable.');
  } else {
    image = image.resize({ width: 16, height: 16 });
  }

  tray = new Tray(image);
  tray.setToolTip('OmniMount');
  tray.on('click', () => onShow && onShow());
  tray.on('double-click', () => onShow && onShow());
  refresh();

  // Keep the menu in step with the drives without polling.
  mounts.on('state', refresh);

  app.on('before-quit', () => {
    mounts.removeListener('state', refresh);
  });

  return tray;
}

function destroy() {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}

module.exports = { create, refresh, destroy };
