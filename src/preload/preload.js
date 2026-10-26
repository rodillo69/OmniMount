'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// The renderer gets exactly these calls and nothing else: no node, no direct
// ipcRenderer, no filesystem.
const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('omni', {
  app: {
    info: () => invoke('app:info'),
    openPath: (target) => invoke('app:openPath', target),
    openExternal: (url) => invoke('app:openExternal', url),
    revealLog: () => invoke('app:revealLog'),
  },

  deps: {
    check: () => invoke('deps:check'),
    ensure: () => invoke('deps:ensure'),
    installRclone: () => invoke('deps:installRclone'),
    installWinFsp: () => invoke('deps:installWinFsp'),
    onProgress: (cb) => subscribe('deps:progress', cb),
  },

  settings: {
    get: () => invoke('settings:get'),
    update: (patch) => invoke('settings:update', patch),
    onChanged: (cb) => subscribe('settings:changed', cb),
  },

  connections: {
    list: () => invoke('conn:list'),
    save: (input) => invoke('conn:save', input),
    remove: (id) => invoke('conn:delete', id),
    test: (payload) => invoke('conn:test', payload),
    listBuckets: (payload) => invoke('conn:listBuckets', payload),
  },

  drives: {
    free: () => invoke('drives:free'),
    suggest: (preferred) => invoke('drives:suggest', preferred),
  },

  window: {
    minimize: () => invoke('window:minimize'),
    toggleMaximize: () => invoke('window:toggle-maximize'),
    close: () => invoke('window:close'),
    state: () => invoke('window:state'),
    onState: (cb) => subscribe('window:state', cb),
  },

  backends: {
    list: () => invoke('backends:list'),
    get: (name) => invoke('backends:get', name),
  },

  setup: {
    createDrive: (input) => invoke('setup:createDrive', input),
    credentials: () => invoke('setup:credentials'),
  },

  mounts: {
    list: () => invoke('mounts:list'),
    save: (input) => invoke('mounts:save', input),
    remove: (id) => invoke('mounts:delete', id),
    status: (id) => invoke('mounts:status', id),
    mount: (id) => invoke('mounts:mount', id),
    unmount: (id) => invoke('mounts:unmount', id),
    remount: (id) => invoke('mounts:remount', id),
    refresh: (id) => invoke('mounts:refresh', id),
    mountAll: (ids) => invoke('mounts:mountAll', ids),
    unmountAll: () => invoke('mounts:unmountAll'),
    open: (id) => invoke('mounts:open', id),
    logs: (id) => invoke('mounts:logs', id),
    clearLogs: (id) => invoke('mounts:clearLogs', id),
    exportLog: (id) => invoke('mounts:exportLog', id),
    onState: (cb) => subscribe('mounts:state', cb),
    onStats: (cb) => subscribe('mounts:stats', cb),
    onLog: (cb) => subscribe('mounts:log', cb),
  },

  explorer: {
    list: (payload) => invoke('explorer:list', payload),
    usage: (payload) => invoke('explorer:usage', payload),
    mkdir: (payload) => invoke('explorer:mkdir', payload),
    remove: (payload) => invoke('explorer:delete', payload),
    rename: (payload) => invoke('explorer:rename', payload),
    upload: (payload) => invoke('explorer:upload', payload),
    download: (payload) => invoke('explorer:download', payload),
    onProgress: (cb) => subscribe('explorer:progress', cb),
  },

  ui: {
    confirm: (payload) => invoke('dialog:confirm', payload),
    onNavigate: (cb) => subscribe('ui:navigate', cb),
  },
});
