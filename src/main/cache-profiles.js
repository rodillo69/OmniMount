'use strict';

/**
 * Cache and read-path profiles.
 *
 * These were measured against a live S3 service rather than reasoned about,
 * and the measurements changed the design, so the findings are recorded here
 * for whoever is tempted to tune them again.
 *
 * What was tried: three profiles, then the chunking varied on its own inside
 * one cache mode, on two workloads — one 150–200 MB file read end to end, and
 * 100–120 files of 256 KB read one after another — always from a cold cache.
 *
 * What came out:
 *
 * - **Cold throughput is set by the link, not by these settings.** Every
 *   configuration landed at roughly 24 MB/s. Repeating one configuration
 *   three times gave 23.4, 26.1 and 39.0 MB/s: a spread of ±26%, wider than
 *   any difference measured *between* configurations. The first run looked
 *   like the fast profile was the slowest one; it was noise.
 * - **Parallel streams bought nothing here.** 0, 4 and 16 streams came out
 *   within noise of each other on both workloads. rclone's documentation
 *   reports throughput scaling with the stream count on high-latency links,
 *   which is plausible and is why the setting is still offered — but on a
 *   link like this one it is not what makes the drive feel fast, and opening
 *   16 connections for an unmeasurable gain is a cost, not a feature.
 * - **The cache hit is the whole story.** The same 150 MB file read a second
 *   time came back at 1051 MB/s against ~25 MB/s cold: forty times. The
 *   folder of small files took 0.21 s warm against 1.91 s when reads were not
 *   cached at all: nine times.
 *
 * So the profiles differ in what decides whether a read is a hit — cache
 * mode, how long a file is kept, how long a listing is trusted — and the
 * concurrency figures stay at sane values instead of being pushed up to make
 * the fast profile look busier. A profile that promised throughput it cannot
 * deliver would be worse than no profile at all.
 *
 * Two settings were deliberately left alone:
 *
 * - `--buffer-size`, because rclone's own advice with `cache-mode full` is to
 *   grow the on-disk read-ahead instead; the buffer is per open file and in
 *   memory.
 * - `--attr-timeout`, because the only gain is fewer kernel callbacks and
 *   rclone's documentation is explicit that the cost is a truncated file or a
 *   file with garbage on the end when the remote changes length inside the
 *   window. Not a trade worth offering under the word "performance".
 */
const PROFILE_IDS = ['performance', 'balanced', 'lowfootprint', 'custom'];

/** The baseline. Everything else is described as a departure from it. */
const BALANCED = {
  cacheMode: 'full',
  // Days a cached file survives after its last use. Zero removes the age
  // limit, leaving eviction to the free-space reserve.
  retentionDays: 7,
  dirCacheSeconds: 60,
  readAheadMB: 64,
  // Modest on purpose: see the note above. Four streams is a hedge for a
  // high-latency link, not a figure any measurement here supports.
  readChunkSizeMB: 16,
  readChunkStreams: 4,
  transfers: 8,
  checkers: 8,
  writeBackSeconds: 5,
  // How long rclone keeps a file handle and its downloaders alive after the
  // last close. Reopening a file inside this window skips setting the
  // downloads up again, which is most of the cost on a small file.
  handleCachingSeconds: 15,
  // Fingerprints without hashing. The hash would mean another request per
  // file just to decide whether a cached copy is still valid.
  fastFingerprint: true,
};

const PROFILES = {
  // Tuned for the thing that measured as real: hitting the cache. A month of
  // retention and listings trusted for five minutes, which is rclone's own
  // default and five times longer than this project used to use.
  //
  // The concurrency figures are the baseline's, deliberately. Pushing them
  // higher produced no measurable gain on the link this was tested against,
  // and it would have made the profile look fast rather than be fast.
  performance: {
    ...BALANCED,
    retentionDays: 30,
    dirCacheSeconds: 300,
    readAheadMB: 128,
    handleCachingSeconds: 60,
  },

  balanced: { ...BALANCED },

  // For a machine where what matters is how little is left behind: reads are
  // never written to the disk, so nothing from the remote lingers beyond what
  // is being saved. The cost is every re-read going back over the network —
  // measured at nine times slower on a folder of small files.
  lowfootprint: {
    ...BALANCED,
    cacheMode: 'writes',
    retentionDays: 1,
    dirCacheSeconds: 30,
    readAheadMB: 0,
    readChunkSizeMB: 128,
    readChunkStreams: 0,
    transfers: 4,
    checkers: 4,
    handleCachingSeconds: 5,
    fastFingerprint: false,
  },
};

const LIMITS = {
  retentionDays: [0, 3650],
  dirCacheSeconds: [1, 86400],
  readAheadMB: [0, 4096],
  readChunkSizeMB: [1, 1024],
  readChunkStreams: [0, 64],
  transfers: [1, 64],
  checkers: [1, 64],
  writeBackSeconds: [1, 3600],
  handleCachingSeconds: [0, 3600],
};

const CACHE_MODES = ['off', 'minimal', 'writes', 'full'];

function clamp(value, [min, max], fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}

/**
 * Bring a tuning object into range, filling anything missing from the
 * balanced baseline. Used for the custom profile, which arrives from the
 * interface and cannot be trusted to be complete or sane.
 */
function sanitize(input = {}) {
  const out = {
    cacheMode: CACHE_MODES.includes(input.cacheMode) ? input.cacheMode : BALANCED.cacheMode,
    fastFingerprint: input.fastFingerprint === undefined
      ? BALANCED.fastFingerprint
      : Boolean(input.fastFingerprint),
  };
  for (const [key, range] of Object.entries(LIMITS)) {
    out[key] = clamp(input[key], range, BALANCED[key]);
  }

  // Retention is the one field where the bottom of the range is not the
  // smallest value: zero means "never expire". Clamping a negative number
  // into it would read someone asking for less as asking for unlimited, so
  // nonsense falls back to the baseline instead.
  if (Number(input.retentionDays) < 0) out.retentionDays = BALANCED.retentionDays;
  return out;
}

/** The profile in force, and the figures it resolves to. */
function resolve(settings = {}) {
  const id = PROFILE_IDS.includes(settings.cacheProfile) ? settings.cacheProfile : 'performance';
  const tuning = id === 'custom' ? sanitize(settings.cacheCustom) : { ...PROFILES[id] };
  return { id, tuning };
}

module.exports = { PROFILE_IDS, PROFILES, BALANCED, LIMITS, CACHE_MODES, sanitize, resolve };
