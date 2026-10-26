'use strict';
const fs = require('node:fs');
const { appLog, dirs } = require('./paths');

const MAX_LOG_BYTES = 2 * 1024 * 1024;
let stream = null;

function open() {
  if (stream) return stream;
  try {
    fs.mkdirSync(dirs.logs, { recursive: true });
    // Rotate once the log grows past the cap, keeping a single previous copy.
    try {
      const { size } = fs.statSync(appLog);
      if (size > MAX_LOG_BYTES) fs.renameSync(appLog, `${appLog}.1`);
    } catch { /* no existing log */ }
    stream = fs.createWriteStream(appLog, { flags: 'a' });
  } catch {
    stream = null;
  }
  return stream;
}

function write(level, scope, ...parts) {
  const message = parts
    .map((part) => (typeof part === 'string' ? part : safeStringify(part)))
    .join(' ');
  const line = `${new Date().toISOString()} [${level}] [${scope}] ${message}`;
  if (level === 'ERROR') console.error(line);
  else console.log(line);
  const out = open();
  if (out) out.write(`${line}\n`);
}

function safeStringify(value) {
  if (value instanceof Error) return value.stack || value.message;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function scoped(scope) {
  return {
    info: (...a) => write('INFO', scope, ...a),
    warn: (...a) => write('WARN', scope, ...a),
    error: (...a) => write('ERROR', scope, ...a),
    debug: (...a) => { if (process.env.OMNIMOUNT_DEBUG) write('DEBUG', scope, ...a); },
  };
}

module.exports = { scoped, logFile: appLog };
