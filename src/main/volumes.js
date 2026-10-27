'use strict';

/**
 * The disks of this computer, and whether one of them can hold a cache.
 *
 * The cache is not an implementation detail the user can ignore: in `full`
 * mode every byte read or written passes through it, so it wants the disk
 * with room and speed, which is not always the one Windows was installed on.
 * This module exists so that choice can be offered with real numbers rather
 * than asking someone to type a path and hope.
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const log = require('./logger').scoped('volumes');

// Win32_LogicalDisk.DriveType. Only a fixed local disk is a sensible home for
// a cache: a network drive would send every cached byte back over the wire,
// and removable media is not there half the time.
const DRIVE_TYPE = { REMOVABLE: 2, FIXED: 3, NETWORK: 4, OPTICAL: 5 };

// Filesystems without sparse file support. rclone needs them for `full` mode:
// a cached file reports its real size while holding only the parts that were
// downloaded. Without that it logs an error and crawls.
const NO_SPARSE = new Set(['FAT', 'FAT32', 'EXFAT']);

// No -AsArray: that is PowerShell 7, and this spawns powershell.exe, which is
// Windows PowerShell 5.1 on every Windows install. Wrapping the pipeline in
// @() keeps a single disk from being emitted as a bare object instead of a
// one-element array — and the parser below does not trust that either.
const LIST = [
  '$disks = @(Get-CimInstance Win32_LogicalDisk |',
  'ForEach-Object {',
  '  [pscustomobject]@{',
  '    letter = $_.DeviceID.TrimEnd(":");',
  '    type = [int]$_.DriveType;',
  '    fs = [string]$_.FileSystem;',
  '    label = [string]$_.VolumeName;',
  '    total = [double]$_.Size;',
  '    free = [double]$_.FreeSpace',
  '  }',
  '});',
  'ConvertTo-Json -InputObject $disks -Compress',
].join(' ');

function query() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', LIST],
      { timeout: 15000, windowsHide: true },
      (err, stdout) => {
        if (err) {
          log.warn('No se pudieron enumerar los volúmenes:', err.message);
          return resolve([]);
        }
        try {
          const parsed = JSON.parse(String(stdout).trim());
          // A lone disk can still arrive as an object rather than an array,
          // depending on the PowerShell in play.
          resolve(Array.isArray(parsed) ? parsed : parsed ? [parsed] : []);
        } catch (parseError) {
          log.warn('Respuesta ilegible al enumerar volúmenes:', parseError.message);
          resolve([]);
        }
      }
    );
  });
}

/**
 * Every volume, annotated with whether it could hold the cache and why not.
 *
 * Nothing is filtered out. A disk that cannot be used is more useful shown
 * with its reason than silently missing, which just looks like the program
 * failed to notice it.
 */
async function list() {
  const rows = await query();
  return rows
    .filter((row) => row && row.letter)
    .map((row) => {
      const filesystem = String(row.fs || '').toUpperCase();
      let reason = null;
      if (row.type === DRIVE_TYPE.NETWORK) reason = 'network';
      else if (row.type === DRIVE_TYPE.OPTICAL) reason = 'optical';
      else if (row.type === DRIVE_TYPE.REMOVABLE) reason = 'removable';
      else if (NO_SPARSE.has(filesystem)) reason = 'filesystem';
      else if (!row.total) reason = 'unreadable';

      return {
        letter: String(row.letter).toUpperCase(),
        label: row.label || '',
        filesystem,
        removable: row.type === DRIVE_TYPE.REMOVABLE,
        total: Number(row.total) || 0,
        free: Number(row.free) || 0,
        usable: reason === null,
        reason,
      };
    })
    .sort((a, b) => a.letter.localeCompare(b.letter));
}

/** The volume a path sits on, with its current free space. */
async function forPath(target) {
  const letter = String(path.parse(path.resolve(target)).root || '')
    .replace(/[:\\/]/g, '')
    .toUpperCase();
  if (!letter) return null;
  const all = await list();
  return all.find((volume) => volume.letter === letter) || null;
}

/**
 * Whether a folder can be used for the cache.
 *
 * `mountedLetters` are the letters OmniMount is itself serving. Caching onto
 * one of those would have rclone writing the cache into the filesystem the
 * cache is backing — the drive feeding itself, which ends in a hang or a loop
 * of uploads, so it is refused rather than warned about.
 */
async function canHoldCache(target, mountedLetters = []) {
  const resolved = path.resolve(target);
  const letter = String(path.parse(resolved).root || '')
    .replace(/[:\\/]/g, '')
    .toUpperCase();

  if (mountedLetters.map((l) => String(l).toUpperCase()).includes(letter)) {
    return { ok: false, reason: 'ownMount', letter };
  }

  const volume = await forPath(resolved);
  if (!volume) return { ok: false, reason: 'unknown', letter };
  if (!volume.usable) return { ok: false, reason: volume.reason, letter, volume };

  // Writable in practice, not just in theory: a folder can exist and still
  // refuse, and finding that out at mount time means a drive that fails for
  // a reason pointing nowhere near the cache setting.
  try {
    fs.mkdirSync(resolved, { recursive: true });
    const probe = path.join(resolved, `.omnimount-write-test-${process.pid}`);
    fs.writeFileSync(probe, 'x');
    fs.rmSync(probe, { force: true });
  } catch (err) {
    return { ok: false, reason: 'notWritable', letter, volume, detail: err.message };
  }

  return { ok: true, letter, volume };
}

module.exports = { list, forPath, canHoldCache, DRIVE_TYPE };
