'use strict';

/**
 * Where the cache lives and how big it is allowed to get.
 *
 * Two decisions live here, and they are different questions.
 *
 * *Where*: by default beside the rest of the application's data, which is
 * usually the system disk. That is the predictable answer, not always the
 * right one — a 256 GB laptop SSD with a 4 TB data disk next to it wants the
 * cache on the data disk — so the volume can be chosen.
 *
 * *How big*: a fixed cap is the wrong shape for this. 10 GB is nothing on a
 * 4 TB disk and too much on a system drive with 12 GB left, and the figure
 * that is right today is wrong when the disk fills up. rclone can be told to
 * keep a minimum amount of the disk free instead, and it evicts the least
 * recently used files to maintain it. The cache then uses whatever is spare
 * and gets out of the way when the disk is needed for something else, with
 * no number for anyone to guess at.
 *
 * A fixed cap is still offered, because someone sharing a disk with another
 * program's data may want a hard ceiling regardless of what is free.
 */

const fs = require('node:fs');
const path = require('node:path');
const { dirs } = require('./paths');
const volumes = require('./volumes');
const store = require('./store');
const log = require('./logger').scoped('cache');

const GB = 1024 ** 3;

/**
 * How much of the disk to keep free, in GB.
 *
 * A tenth of the disk, never less than 5 GB and never more than 50. The floor
 * is there because a percentage of a small disk is not enough room for
 * Windows to breathe; the ceiling because a tenth of an 8 TB disk is 800 GB
 * held back for nothing.
 */
function reserveGB(volume) {
  if (!volume || !volume.total) return 10;
  const tenth = (volume.total / GB) * 0.1;
  return Math.round(Math.min(50, Math.max(5, tenth)));
}

/** The configured cache root, or the default beside the application data. */
function root() {
  const configured = (store.getSettings().cacheLocation || '').trim();
  return configured || dirs.cache;
}

/** Each drive gets its own folder: they are separate rclone processes. */
function dirFor(mountId) {
  return path.join(root(), mountId);
}

/**
 * The cache settings for one mount, resolved against the disk as it is now.
 *
 * Recomputed per mount rather than stored, because free space is not a
 * setting: the right reserve on a disk someone has since filled is not the
 * one worked out when the drive was created.
 */
async function plan(mountId) {
  const dir = dirFor(mountId);
  const settings = store.getSettings();
  const volume = await volumes.forPath(dir);

  const limitGB = Number(settings.cacheLimitGB) || 0;
  return {
    dir,
    volume,
    // Always set. It is the part that keeps the disk usable.
    minFreeSpaceGB: reserveGB(volume),
    // Zero means no ceiling: the reserve governs instead.
    maxSizeGB: limitGB > 0 ? limitGB : 0,
    automatic: limitGB <= 0,
  };
}

/* ------------------------------------------------------------- pending */

/**
 * Count files the cache is still holding that are not on the remote yet.
 *
 * rclone writes one metadata file per cached item next to the data, carrying
 * a `Dirty` flag that stays true until the upload succeeds. Anything dirty is
 * the only copy of that data in existence, so this is what stands between
 * "clear the cache" and losing someone's work.
 *
 * Counting rather than trusting: an unreadable metadata file is treated as
 * dirty, because the dangerous mistake is the other way round.
 */
function pendingUploads(mountId) {
  const meta = path.join(dirFor(mountId), 'vfsMeta');
  let pending = 0;

  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      try {
        if (JSON.parse(fs.readFileSync(full, 'utf8')).Dirty === true) pending += 1;
      } catch {
        // Unreadable means unknown, and unknown is treated as pending.
        pending += 1;
      }
    }
  };

  walk(meta);
  return pending;
}

/* ---------------------------------------------------------------- size */

function sizeOf(dir) {
  let total = 0;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += sizeOf(full);
      continue;
    }
    try {
      // Sparse files: what a cached file costs on disk is what is allocated,
      // not the size it reports. Windows does not always fill `blocks` in,
      // so the reported size is the fallback — an overestimate, which is the
      // safer direction for a figure shown as "space used".
      const stat = fs.statSync(full);
      total += stat.blocks ? stat.blocks * 512 : stat.size;
    } catch {
      /* vanished mid-walk, which the next poll will reflect */
    }
  }
  return total;
}

/** What each drive's cache is taking up, and what it is still holding. */
function usage() {
  const base = root();
  const rows = [];
  let entries = [];
  try {
    entries = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    return { root: base, total: 0, drives: [] };
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const bytes = sizeOf(path.join(base, entry.name));
    rows.push({ mountId: entry.name, bytes, pending: pendingUploads(entry.name) });
  }

  return {
    root: base,
    total: rows.reduce((sum, row) => sum + row.bytes, 0),
    drives: rows,
  };
}

/* -------------------------------------------------------------- remove */

/**
 * Delete one drive's cache.
 *
 * Refuses while anything is still waiting to be uploaded, because that data
 * exists nowhere else. `force` is for the caller that has already told the
 * user exactly what would be lost and had them agree.
 */
function remove(mountId, { force = false } = {}) {
  const dir = dirFor(mountId);
  if (!fs.existsSync(dir)) return { removed: false, pending: 0 };

  const pending = pendingUploads(mountId);
  if (pending > 0 && !force) return { removed: false, pending };

  fs.rmSync(dir, { recursive: true, force: true });
  log.info(`Caché de ${mountId} eliminada${pending ? ` (${pending} pendientes descartados)` : ''}.`);
  return { removed: true, pending };
}

module.exports = { root, dirFor, plan, usage, pendingUploads, remove, reserveGB };
