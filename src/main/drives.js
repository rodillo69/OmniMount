'use strict';
const fs = require('node:fs');
const { execFile } = require('node:child_process');
const log = require('./logger').scoped('drives');

const ALL_LETTERS = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Windows reports a letter through several mechanisms and none of them is
// complete on its own: Win32_LogicalDisk misses some redirector mappings and a
// stat() on a disconnected network mapping can hang or throw. We union both.
function fromPowerShell() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        '(Get-CimInstance Win32_LogicalDisk).DeviceID -join ","',
      ],
      { timeout: 8000, windowsHide: true },
      (err, stdout) => {
        if (err) {
          log.warn('No se pudo enumerar unidades por CIM:', err.message);
          return resolve([]);
        }
        const letters = String(stdout)
          .split(',')
          .map((part) => part.trim().replace(':', '').toUpperCase())
          .filter((part) => /^[A-Z]$/.test(part));
        resolve(letters);
      }
    );
  });
}

function fromFileSystem() {
  const used = [];
  for (const letter of ALL_LETTERS) {
    try {
      if (fs.existsSync(`${letter}:\\`)) used.push(letter);
    } catch {
      // An unreadable root still means the letter is taken.
      used.push(letter);
    }
  }
  return used;
}

async function usedLetters() {
  const [cim, direct] = await Promise.all([fromPowerShell(), Promise.resolve(fromFileSystem())]);
  return [...new Set([...cim, ...direct, 'A', 'B', 'C'])].sort();
}

async function freeLetters() {
  const used = new Set(await usedLetters());
  return ALL_LETTERS.filter((letter) => !used.has(letter));
}

// Network drives conventionally take the tail of the alphabet, so we offer the
// highest free letter first.
async function suggestLetter(preferred = []) {
  const free = await freeLetters();
  for (const letter of preferred) {
    const normalised = String(letter || '').toUpperCase();
    if (free.includes(normalised)) return normalised;
  }
  return free.length ? free[free.length - 1] : null;
}

function isLetterPresent(letter) {
  try {
    return fs.existsSync(`${String(letter).toUpperCase()}:\\`);
  } catch {
    return false;
  }
}

module.exports = { ALL_LETTERS, usedLetters, freeLetters, suggestLetter, isLetterPresent };
