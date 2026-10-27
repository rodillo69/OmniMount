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

/**
 * Whether a letter is not merely defined but actually serves files.
 *
 * existsSync is not enough to call a mount finished. A drive letter is a
 * symlink in the DOS device table, and the symlink appears the moment WinFsp
 * publishes it — before the filesystem behind it is answering, and it stays
 * there if that filesystem dies. Both cases look identical to existsSync, and
 * both are what "it says it mounted but there is nothing there" looks like
 * from the outside.
 *
 * Reading the root directory is the cheapest question only a live filesystem
 * can answer, so that is the test.
 */
function isLetterServing(letter) {
  const root = `${String(letter).toUpperCase()}:\\`;
  try {
    fs.readdirSync(root);
    return true;
  } catch (err) {
    // A directory that exists but refuses to be read is a mount that is up and
    // simply empty of permissions, not a broken one.
    return err && err.code === 'EACCES';
  }
}

// SHChangeNotify, called with the event ids the shell uses for a drive
// appearing (SHCNE_DRIVEADD) and going away (SHCNE_DRIVEREMOVED), with
// SHCNF_PATH | SHCNF_FLUSH. There is no Electron or Node API for it, and the
// C# is compiled on demand, which costs about half a second — paid once per
// mount, which is the right place to pay it.
//
// The drive letter is written into the script rather than passed as an
// argument because `powershell -Command <text> a b` appends the extra tokens
// to the command text instead of filling $args, which runs them as commands
// of their own. The letter is a single validated character, so there is
// nothing to inject.
function notifyScript(letter, added) {
  return `
$source = @'
using System;
using System.Runtime.InteropServices;
public static class OmniMountShell {
  [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
  private static extern void SHChangeNotify(int eventId, uint flags, IntPtr item1, IntPtr item2);
  public static void Drive(string root, bool added) {
    IntPtr p = Marshal.StringToHGlobalUni(root);
    try { SHChangeNotify(added ? 0x00000100 : 0x00000080, 0x0005, p, IntPtr.Zero); }
    finally { Marshal.FreeHGlobal(p); }
  }
}
'@
Add-Type -TypeDefinition $source -Language CSharp
[OmniMountShell]::Drive('${letter}:\\', $${added ? 'true' : 'false'})
`;
}

/**
 * Tell the shell a drive has come or gone.
 *
 * WinFsp creates the letter with DefineDosDevice, which does not announce
 * itself to the shell. A newly opened Explorer window enumerates the letters
 * and finds it, but a window that was already open keeps the list it built
 * when it opened — so the drive is there, works, and is missing from "This PC"
 * until something forces a refresh. This is that something.
 *
 * Never throws and is never awaited for correctness: the mount is already
 * valid, this only decides whether the user has to press F5.
 */
function notifyShell(letter, added) {
  const normalised = String(letter || '').toUpperCase();
  if (!/^[A-Z]$/.test(normalised)) return Promise.resolve(false);

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        notifyScript(normalised, added),
      ],
      { timeout: 20000, windowsHide: true },
      (err) => {
        if (err) log.warn(`No se pudo avisar al Explorador de ${normalised}:`, err.message);
        resolve(!err);
      }
    );
  });
}

module.exports = {
  ALL_LETTERS,
  usedLetters,
  freeLetters,
  suggestLetter,
  isLetterPresent,
  isLetterServing,
  notifyShell,
};
