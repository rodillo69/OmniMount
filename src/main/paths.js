'use strict';
const { app } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const userData = app.getPath('userData');

const dirs = {
  userData,
  bin: path.join(userData, 'bin'),
  logs: path.join(userData, 'logs'),
  cache: path.join(userData, 'vfs-cache'),
  temp: path.join(userData, 'temp'),
};

function ensureDirs() {
  for (const dir of Object.values(dirs)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = {
  dirs,
  ensureDirs,
  configFile: path.join(userData, 'config.json'),
  rcloneExe: path.join(dirs.bin, 'rclone.exe'),
  appLog: path.join(dirs.logs, 'omnimount.log'),
  mountCacheDir: (mountId) => path.join(dirs.cache, mountId),
};
