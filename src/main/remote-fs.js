'use strict';

/**
 * Browsing and editing files on a remote, for every backend.
 *
 * This replaces the hand-written S3 client the app started with. That client
 * spoke one protocol, which meant the file browser only ever worked against
 * S3. Every operation here is expressed as an rclone command instead, so the
 * same code browses an SFTP server, a WebDAV share or a bucket without
 * knowing the difference.
 *
 * rclone is already a dependency and already holds the credentials, so this
 * costs nothing extra and removes a few hundred lines of protocol code that
 * would otherwise need its own signing, pagination and error handling for
 * each new backend.
 */

const path = require('node:path');
const rclone = require('./rclone');
const log = require('./logger').scoped('remote-fs');

/** `remote:base/sub` for a connection, with empty segments dropped. */
function target(connection, base, sub) {
  const parts = [base, sub].filter((p) => p !== undefined && p !== null && p !== '');
  return `${rclone.REMOTE}:${parts.join('/')}`;
}

/**
 * One directory level.
 *
 * `lsjson` returns a single JSON array with name, size, modification time and
 * whether each entry is a directory. Unlike the S3 listing it replaced, there
 * are no continuation tokens and no placeholder keys to filter out: rclone
 * presents every backend as an ordinary hierarchy.
 */
async function list(connection, base, prefix) {
  const env = await rclone.buildEnv(connection);
  const output = await rclone.run(
    ['lsjson', target(connection, base, prefix), '--no-modtime', '--fast-list'],
    env,
    60000
  );

  let entries;
  try {
    entries = JSON.parse(output);
  } catch (err) {
    throw new Error(`Could not read the folder listing: ${err.message}`);
  }

  const items = entries.map((entry) => ({
    name: entry.Name,
    // Keys stay relative to the base so the renderer can keep using them as
    // breadcrumbs without knowing about the remote's naming.
    key: [prefix, entry.Name].filter(Boolean).join('/'),
    size: entry.IsDir ? null : entry.Size,
    modified: entry.ModTime || null,
    isFolder: Boolean(entry.IsDir),
  }));

  // Folders first, then files, each alphabetically. rclone's own order varies
  // by backend, and a listing that reorders itself per server reads as a bug.
  items.sort((a, b) => {
    if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

  return { items, truncated: false, token: null };
}

/** Total bytes and object count below a path. */
async function usage(connection, base, prefix) {
  const env = await rclone.buildEnv(connection);
  const output = await rclone.run(
    ['size', target(connection, base, prefix), '--json'],
    env,
    120000
  );
  const parsed = JSON.parse(output);
  return { bytes: parsed.bytes || 0, objects: parsed.count || 0 };
}

async function createFolder(connection, base, folder) {
  const env = await rclone.buildEnv(connection);
  await rclone.run(['mkdir', target(connection, base, folder)], env, 30000);
  return { ok: true };
}

/**
 * Delete files.
 *
 * `deletefile` takes one path at a time and fails on a directory, which is
 * what makes it safe here: a mistaken directory argument cannot silently
 * remove a tree.
 */
async function deleteFiles(connection, base, keys) {
  const env = await rclone.buildEnv(connection);
  let removed = 0;

  for (const key of keys) {
    try {
      await rclone.run(['deletefile', target(connection, base, key)], env, 60000);
      removed += 1;
    } catch (err) {
      log.warn(`Could not delete ${key}:`, err.message);
      throw new Error(`Could not delete "${key}": ${err.message}`);
    }
  }

  return { removed };
}

/** Delete a folder and everything under it. */
async function deleteFolder(connection, base, folder) {
  const env = await rclone.buildEnv(connection);
  await rclone.run(['purge', target(connection, base, folder)], env, 300000);
  return { ok: true };
}

/** Rename within the same remote, without moving bytes where the backend can. */
async function rename(connection, base, from, to) {
  const env = await rclone.buildEnv(connection);
  await rclone.run(
    ['moveto', target(connection, base, from), target(connection, base, to)],
    env,
    300000
  );
  return { ok: true };
}

async function upload(connection, base, key, localPath, onProgress) {
  const env = await rclone.buildEnv(connection);
  await rclone.run(
    ['copyto', localPath, target(connection, base, key), '--ignore-times'],
    env,
    0
  );
  if (onProgress) onProgress({ done: true });
  return { ok: true };
}

async function download(connection, base, key, localPath) {
  const env = await rclone.buildEnv(connection);
  await rclone.run(['copyto', target(connection, base, key), localPath], env, 0);
  return { ok: true, path: localPath };
}

/**
 * Check that a remote is reachable and the credentials work.
 *
 * Listing one entry is enough and is the cheapest request that still
 * exercises authentication on every backend.
 */
async function test(connection, base) {
  const env = await rclone.buildEnv(connection);
  try {
    // `lsf` rather than `lsjson`: it prints bare names, so the reply stays
    // small on a large bucket, and it still exercises authentication.
    await rclone.run(
      ['lsf', target(connection, base, ''), '--max-depth', '1'],
      env,
      30000
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, message: friendlyError(err.message) };
  }
}

/**
 * rclone's errors are accurate but written for a terminal. These are the ones
 * users actually hit, rewritten as something actionable.
 */
function friendlyError(message) {
  const text = String(message);

  if (/InvalidAccessKeyId|SignatureDoesNotMatch|403|AccessDenied/i.test(text)) {
    return 'The credentials were rejected by the server. Check the key and secret.';
  }
  if (/NoSuchBucket|404 |not found|directory not found/i.test(text)) {
    return 'That bucket or folder does not exist on the server.';
  }
  if (/no such host|dial tcp|connection refused|timeout|i\/o timeout/i.test(text)) {
    return 'The server could not be reached. Check the address and your connection.';
  }
  if (/certificate|x509|tls/i.test(text)) {
    return 'The server’s certificate could not be verified.';
  }
  if (/ssh: handshake failed|unable to authenticate/i.test(text)) {
    return 'The server refused the login. Check the user and password or key.';
  }

  // Keep the last line: rclone puts the cause there and the rest is context.
  return text.split('\n').filter(Boolean).pop() || text;
}

module.exports = {
  list,
  usage,
  createFolder,
  deleteFiles,
  deleteFolder,
  rename,
  upload,
  download,
  test,
  friendlyError,
};
