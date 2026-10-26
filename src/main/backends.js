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
const presets = require('./presets');
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

/**
 * Backends that wrap another remote instead of reaching a server.
 *
 * `alias`, `crypt`, `cache`, `union` and friends take an existing remote and
 * change how it behaves. They are useful, but they cannot be the thing you
 * connect to: offering "Alias for an existing remote" in a list of storage
 * services is an invitation to pick something that cannot work on its own.
 * `local` is excluded for the same reason from the other direction: a local
 * folder does not need mounting as a drive.
 */
const WRAPPERS = new Set([
  'alias',
  'archive',
  'cache',
  'chunker',
  'combine',
  'compress',
  'crypt',
  'hasher',
  'union',
  'memory',
  'local',
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
/**
 * Options this app treats as advanced regardless of what rclone says.
 *
 * `env_auth` tells rclone to take credentials from environment variables or
 * instance metadata instead of asking. That is a server-side deployment
 * choice; on a desktop, where the whole point of the form is to collect
 * credentials, offering it first only invites a drive that cannot
 * authenticate.
 */
const FORCE_ADVANCED = new Set(['env_auth']);

/**
 * Fields that identify *where* the storage is and *who* you are.
 *
 * rclone's own `Advanced` flag is written for a config tool that walks you
 * through every option, so it leaves things like ACLs, location constraints
 * and object-lock defaults in the basic set. None of those are needed to
 * mount a drive, and each one is another box between the user and a working
 * connection.
 *
 * So the basic form keeps three kinds of field and pushes the rest behind
 * "more options": what rclone marks as required, anything holding a
 * credential, and the handful below that name the server or the account.
 */
const CONNECTION_FIELDS = new Set([
  'provider',
  'vendor',
  'endpoint',
  'url',
  'host',
  'port',
  'region',
  'user',
  'username',
  'account',
  'domain',
  'share',
  'access_key_id',
  'secret_access_key',
  'key',
  'pass',
  'password',
  'key_file',
  'token',
]);

/** Is this field part of the minimum needed to connect? */
function isEssential(option) {
  if (FORCE_ADVANCED.has(option.Name)) return false;
  return (
    Boolean(option.Required) ||
    Boolean(option.IsPassword) ||
    CONNECTION_FIELDS.has(option.Name)
  );
}

function toField(option) {
  const examples = Array.isArray(option.Examples) ? option.Examples : [];

  return {
    name: option.Name,
    label: humanise(option.Name),
    help: firstLine(option.Help),
    type: option.Type,
    required: Boolean(option.Required),
    advanced: Boolean(option.Advanced) || !isEssential(option),
    // IsPassword means rclone stores it obscured and rejects it in clear text.
    secret: Boolean(option.IsPassword),
    // Sensitive is weaker: shown masked, stored as-is.
    sensitive: Boolean(option.Sensitive),
    // Which providers the option applies to. rclone states this itself: an
    // empty value means every provider, a list restricts it, and a list
    // starting with "!" excludes instead of includes. It is why an IBM API
    // key does not belong on a Wasabi form.
    providers: String(option.Provider || ''),
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
    // Wrappers cannot stand alone, and the OAuth ones cannot be set up from a
    // form at all. Showing either would offer a choice that leads nowhere, so
    // the catalogue contains only what the app can actually connect to.
    .filter((provider) => !WRAPPERS.has(provider.Name) && !NEEDS_OAUTH.has(provider.Name))
    .map((provider) => {
      const fields = (provider.Options || []).filter((o) => !o.Hide).map(toField);
      return {
        name: provider.Name,
        label: LABELS[provider.Name] || provider.Description,
        // Most backends describe themselves with their own name, which would
        // print twice on a card. Only keep a description that adds something.
        description:
          (LABELS[provider.Name] || provider.Description) === provider.Description
            ? ''
            : provider.Description,
        featured: FEATURED.includes(provider.Name),
        order: FEATURED.indexOf(provider.Name),
        needsOAuth: NEEDS_OAUTH.has(provider.Name),
        root: ROOT_FIELD[provider.Name] || null,
        // Known services for this type, each with its own addresses.
        presets: presets.forType(provider.Name),
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
