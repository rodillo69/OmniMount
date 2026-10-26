'use strict';

/**
 * The catalogue of storage types the app can mount.
 *
 * Nothing here is a hand-written list of fields. rclone describes its own
 * backends through `rclone config providers`, which returns, for every option,
 * its name, type, help text, default, whether it is required and whether it
 * holds a password. Reading that is what lets the app offer every backend the
 * installed rclone supports, with the right field names, instead of a handful
 * transcribed by hand that drift the moment rclone changes.
 *
 * It also means the catalogue grows by itself when the user's rclone is
 * updated.
 */

const { execFile } = require('node:child_process');
const { rcloneExe } = require('./paths');
const log = require('./logger').scoped('backends');

/**
 * Backends offered first, in this order.
 *
 * They are the ones that work with nothing but a form: an address and
 * credentials. Everything else rclone supports stays available behind "all
 * types", but these cover what people actually mount as a drive.
 */
const FEATURED = ['s3', 'sftp', 'ftp', 'webdav', 'smb', 'b2', 'azureblob', 'swift', 'http'];

/**
 * Backends that need an OAuth browser round-trip before they can be used.
 *
 * Their forms look deceptively short — two or three fields — because the real
 * credential is a token obtained interactively, which this app does not yet
 * do. Offering them with a plain form would produce remotes that fail at mount
 * time with an authentication error the user cannot act on, so they are
 * marked and shown as unavailable instead.
 */
const NEEDS_OAUTH = new Set([
  'drive',
  'dropbox',
  'onedrive',
  'box',
  'pcloud',
  'googlephotos',
  'yandex',
  'premiumizeme',
  'putio',
  'sharefile',
  'zoho',
  'hidrive',
  'acd',
  'drime',
  'gofile',
]);

/** Friendlier names than rclone's own, where its description is a mouthful. */
const LABELS = {
  s3: 'S3 compatible storage',
  sftp: 'SFTP (SSH)',
  ftp: 'FTP',
  webdav: 'WebDAV',
  smb: 'Windows share (SMB)',
  b2: 'Backblaze B2',
  azureblob: 'Azure Blob Storage',
  swift: 'OpenStack Swift',
  http: 'HTTP (read-only)',
};

/**
 * How a backend names the container that becomes the drive root, and whether
 * it has one at all.
 *
 * S3 mounts a bucket, Swift a container, B2 a bucket. SFTP, FTP, SMB and
 * WebDAV mount a path instead, and SMB calls its own first path segment a
 * share. Asking "bucket name" for an SFTP server is how the current form got
 * this wrong.
 */
const ROOT_FIELD = {
  s3: { kind: 'bucket', label: 'Bucket', placeholder: 'my-bucket', required: true },
  b2: { kind: 'bucket', label: 'Bucket', placeholder: 'my-bucket', required: true },
  swift: { kind: 'bucket', label: 'Container', placeholder: 'my-container', required: true },
  azureblob: { kind: 'bucket', label: 'Container', placeholder: 'my-container', required: true },
  smb: { kind: 'share', label: 'Share', placeholder: 'shared', required: true },
  sftp: { kind: 'path', label: 'Remote folder', placeholder: '/home/user', required: false },
  ftp: { kind: 'path', label: 'Remote folder', placeholder: '/', required: false },
  webdav: { kind: 'path', label: 'Remote folder', placeholder: '', required: false },
  http: { kind: 'path', label: 'Remote folder', placeholder: '', required: false },
};

let cache = null;

/** Run rclone and parse its JSON description of every backend it carries. */
function readProviders() {
  return new Promise((resolve, reject) => {
    execFile(
      rcloneExe,
      ['config', 'providers'],
      { maxBuffer: 16 * 1024 * 1024, windowsHide: true },
      (err, stdout) => {
        if (err) return reject(err);
        try {
          resolve(JSON.parse(stdout));
        } catch (parseError) {
          reject(new Error(`rclone returned a provider list that is not JSON: ${parseError.message}`));
        }
      }
    );
  });
}

/**
 * Turn one rclone option into something a form can render.
 *
 * `Advanced` options are kept but flagged: they belong behind a disclosure,
 * not in the main form. `Hide` is rclone's own marker for options that should
 * never be shown, so those are dropped entirely.
 */
function toField(option) {
  const examples = Array.isArray(option.Examples) ? option.Examples : [];

  return {
    name: option.Name,
    label: humanise(option.Name),
    help: firstLine(option.Help),
    type: option.Type,
    required: Boolean(option.Required),
    advanced: Boolean(option.Advanced),
    // IsPassword means rclone stores it obscured and rejects it in clear text.
    secret: Boolean(option.IsPassword),
    // Sensitive is weaker: shown masked, stored as-is.
    sensitive: Boolean(option.Sensitive),
    default: option.DefaultStr === '' ? null : option.DefaultStr,
    // Exclusive says the examples are the only valid values, so the field is a
    // closed list. Otherwise they are suggestions and free text is allowed.
    exclusive: Boolean(option.Exclusive),
    options: examples.map((e) => ({ value: e.Value, label: e.Help || e.Value })),
  };
}

function firstLine(help) {
  return String(help || '').split('\n')[0].trim();
}

/** `access_key_id` -> `Access key id`. rclone's names are snake_case. */
function humanise(name) {
  const text = String(name).replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The whole catalogue, read once and kept. */
async function catalogue() {
  if (cache) return cache;

  const providers = await readProviders();
  const types = providers
    .map((provider) => {
      const fields = (provider.Options || []).filter((o) => !o.Hide).map(toField);
      return {
        name: provider.Name,
        label: LABELS[provider.Name] || provider.Description,
        description: provider.Description,
        featured: FEATURED.includes(provider.Name),
        order: FEATURED.indexOf(provider.Name),
        needsOAuth: NEEDS_OAUTH.has(provider.Name),
        root: ROOT_FIELD[provider.Name] || null,
        fields,
      };
    })
    // Featured first in their given order, then everything else alphabetically.
    .sort((a, b) => {
      if (a.featured && b.featured) return a.order - b.order;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.label.localeCompare(b.label);
    });

  cache = { types, rcloneBackends: types.length };
  log.info(`Catalogue ready: ${types.length} backends, ${types.filter((t) => t.featured).length} featured`);
  return cache;
}

/** One backend by name, or null. */
async function byName(name) {
  const { types } = await catalogue();
  return types.find((t) => t.name === name) || null;
}

/** Drop the cache so a newly installed rclone is picked up. */
function refresh() {
  cache = null;
}

module.exports = { catalogue, byName, refresh, FEATURED, NEEDS_OAUTH };
