'use strict';
const https = require('node:https');
const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const { URL } = require('node:url');
const log = require('./logger').scoped('s3');

const SERVICE = 's3';
const EMPTY_SHA256 = crypto.createHash('sha256').update('').digest('hex');

/* ------------------------------------------------------------ signing v4 */

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function signingKey(secret, dateStamp, region) {
  const kDate = hmac(`AWS4${secret}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, 'aws4_request');
}

// S3 wants each path segment percent-encoded, but the slashes between
// segments left alone. encodeURIComponent is also too lax about !'()* and too
// strict about nothing, so we patch those up by hand.
function uriEncode(value, encodeSlash = true) {
  const encoded = encodeURIComponent(String(value)).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return encodeSlash ? encoded : encoded.replace(/%2F/g, '/');
}

function canonicalQuery(query) {
  const pairs = [];
  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null) continue;
    pairs.push([uriEncode(key), uriEncode(value)]);
  }
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1));
  return pairs.map(([k, v]) => `${k}=${v}`).join('&');
}

/* ------------------------------------------------------------- requesting */

function resolveTarget(conn, bucket, key) {
  const base = new URL(conn.endpoint);
  const encodedKey = key ? uriEncode(key, false) : '';

  // Virtual-host addressing needs a wildcard DNS record and a matching
  // certificate. the StorageGRID endpoint has neither, so path-style is the
  // default and the flag exists only for other providers.
  if (conn.forcePathStyle === false && bucket) {
    base.hostname = `${bucket}.${base.hostname}`;
    return { url: base, path: `/${encodedKey}` };
  }
  const segments = [bucket, encodedKey].filter(Boolean).join('/');
  return { url: base, path: `/${segments}` };
}

function buildRequest({ conn, method = 'GET', bucket, key, query, payloadHash, headers = {}, contentLength }) {
  const { url, path: canonicalPath } = resolveTarget(conn, bucket, key);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = conn.region || 'us-east-1';
  const host = url.port ? `${url.hostname}:${url.port}` : url.hostname;
  const hash = payloadHash || EMPTY_SHA256;

  const allHeaders = {
    host,
    'x-amz-content-sha256': hash,
    'x-amz-date': amzDate,
    ...headers,
  };
  if (contentLength !== undefined) allHeaders['content-length'] = String(contentLength);

  const sortedKeys = Object.keys(allHeaders)
    .map((h) => h.toLowerCase())
    .sort();
  const lowered = {};
  for (const [k, v] of Object.entries(allHeaders)) lowered[k.toLowerCase()] = String(v).trim();

  const canonicalHeaders = sortedKeys.map((h) => `${h}:${lowered[h]}\n`).join('');
  const signedHeaders = sortedKeys.join(';');
  const qs = canonicalQuery(query);

  const canonicalRequest = [
    method,
    canonicalPath,
    qs,
    canonicalHeaders,
    signedHeaders,
    hash,
  ].join('\n');

  const scope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signature = crypto
    .createHmac('sha256', signingKey(conn.secretAccessKey, dateStamp, region))
    .update(stringToSign, 'utf8')
    .digest('hex');

  allHeaders.Authorization =
    `AWS4-HMAC-SHA256 Credential=${conn.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    options: {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      method,
      path: qs ? `${canonicalPath}?${qs}` : canonicalPath,
      headers: allHeaders,
      timeout: 30000,
    },
    transport: url.protocol === 'https:' ? https : http,
  };
}

function send(request, { body, bodyStream, toFile } = {}) {
  return new Promise((resolve, reject) => {
    const req = request.transport.request(request.options, (res) => {
      const status = res.statusCode;

      if (toFile && status >= 200 && status < 300) {
        const out = fs.createWriteStream(toFile);
        res.pipe(out);
        out.on('finish', () => resolve({ status, headers: res.headers, body: '' }));
        out.on('error', reject);
        res.on('error', reject);
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () =>
        resolve({
          status,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        })
      );
      res.on('error', reject);
    });

    req.on('timeout', () => req.destroy(new Error('Tiempo de espera agotado contra el endpoint S3.')));
    req.on('error', reject);

    if (bodyStream) {
      bodyStream.on('error', reject);
      bodyStream.pipe(req);
    } else {
      if (body) req.write(body);
      req.end();
    }
  });
}

/* ------------------------------------------------------------ xml helpers */

function unescapeXml(value) {
  return String(value)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function tagValue(xml, tag) {
  const match = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match ? unescapeXml(match[1]) : null;
}

function tagBlocks(xml, tag) {
  const blocks = [];
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g');
  let match;
  while ((match = re.exec(xml)) !== null) blocks.push(match[1]);
  return blocks;
}

// We always ask for encoding-type=url so that keys with newlines, ampersands
// or non-ASCII characters survive the round trip intact.
function decodeKey(value) {
  if (value === null || value === undefined) return '';
  try {
    return decodeURIComponent(String(value).replace(/\+/g, ' '));
  } catch {
    return String(value);
  }
}

function describeError(status, xmlBody, fallback) {
  const code = tagValue(xmlBody, 'Code');
  const message = tagValue(xmlBody, 'Message');
  const known = {
    AccessDenied: 'Acceso denegado: revisa la Access Key, la Secret Key o los permisos sobre el bucket.',
    SignatureDoesNotMatch: 'La firma no coincide: la Secret Key es incorrecta.',
    InvalidAccessKeyId: 'La Access Key no existe en este endpoint.',
    NoSuchBucket: 'El bucket no existe en este endpoint.',
    NoSuchKey: 'El objeto no existe.',
    RequestTimeTooSkewed: 'La hora del equipo esta desajustada respecto al servidor.',
  };
  if (code && known[code]) return `${known[code]} (${code})`;
  if (code) return `${code}${message ? `: ${message}` : ''}`;
  if (status === 404) return 'El endpoint responde 404: comprueba la URL y el bucket.';
  if (status === 403) return 'El endpoint responde 403: credenciales o permisos insuficientes.';
  return fallback || `El endpoint respondio ${status}.`;
}

/* ----------------------------------------------------------------- client */

async function call(conn, spec, payload) {
  assertConnection(conn);
  const request = buildRequest({ conn, ...spec });
  const res = await send(request, payload);
  if (res.status < 200 || res.status >= 300) {
    const err = new Error(describeError(res.status, res.body));
    err.status = res.status;
    err.code = tagValue(res.body, 'Code');
    throw err;
  }
  return res;
}

function assertConnection(conn) {
  if (!conn || !conn.endpoint) throw new Error('La conexion no tiene endpoint.');
  if (!conn.accessKeyId) throw new Error('La conexion no tiene Access Key.');
  if (!conn.secretAccessKey) throw new Error('La conexion no tiene Secret Key.');
}

/**
 * One page of a bucket listing, split into prefixes ("folders") and objects.
 */
async function listObjects(conn, { bucket, prefix = '', delimiter = '/', token, maxKeys = 1000 } = {}) {
  const res = await call(conn, {
    method: 'GET',
    bucket,
    query: {
      'list-type': '2',
      'encoding-type': 'url',
      prefix: prefix || undefined,
      delimiter: delimiter || undefined,
      'max-keys': String(maxKeys),
      'continuation-token': token || undefined,
    },
  });

  const xml = res.body;
  const folders = tagBlocks(xml, 'CommonPrefixes')
    .map((block) => decodeKey(tagValue(block, 'Prefix')))
    .filter(Boolean)
    .map((full) => ({
      type: 'folder',
      key: full,
      name: full.replace(/\/$/, '').split('/').pop(),
    }));

  const objects = tagBlocks(xml, 'Contents')
    .map((block) => {
      const key = decodeKey(tagValue(block, 'Key'));
      return {
        type: 'file',
        key,
        name: key.split('/').pop(),
        size: Number(tagValue(block, 'Size') || 0),
        lastModified: tagValue(block, 'LastModified'),
        etag: (tagValue(block, 'ETag') || '').replace(/"/g, ''),
        storageClass: tagValue(block, 'StorageClass'),
      };
    })
    // Una clave de cero bytes acabada en "/" es el marcador de carpeta. Con
    // delimitador ya aparece como CommonPrefix, así que repetirla sería ruido;
    // sin delimitador, en cambio, es un objeto más y hay que contarlo y
    // poder borrarlo, o las carpetas vacías quedarían para siempre.
    .filter((obj) => (delimiter ? obj.name !== '' : true));

  return {
    bucket,
    prefix,
    folders,
    objects,
    truncated: tagValue(xml, 'IsTruncated') === 'true',
    nextToken: tagValue(xml, 'NextContinuationToken'),
  };
}

/**
 * Probe a connection the only way this endpoint allows. ListAllMyBuckets is
 * denied for tenant keys on StorageGRID, so when a bucket is supplied we
 * list it; otherwise we fall back to the service call just to tell a credential
 * failure apart from a permissions one.
 */
async function testConnection(conn, bucket) {
  const started = Date.now();
  try {
    if (bucket) {
      const page = await listObjects(conn, { bucket, maxKeys: 10 });
      return {
        ok: true,
        latencyMs: Date.now() - started,
        bucket,
        message: 'Conexion correcta y bucket accesible.',
        sample: [...page.folders, ...page.objects].slice(0, 10),
        empty: page.folders.length === 0 && page.objects.length === 0,
      };
    }
    const res = await call(conn, { method: 'GET' });
    const buckets = tagBlocks(res.body, 'Bucket')
      .map((block) => tagValue(block, 'Name'))
      .filter(Boolean);
    return {
      ok: true,
      latencyMs: Date.now() - started,
      message: 'Credenciales validas.',
      buckets,
    };
  } catch (err) {
    // 403 on the service endpoint is expected here and says nothing about the
    // credentials, so we report it as "needs a bucket name" instead of failure.
    if (!bucket && err.status === 403) {
      return {
        ok: false,
        needsBucket: true,
        latencyMs: Date.now() - started,
        message:
          'El endpoint no permite listar buckets con esta clave (403). Indica el nombre del bucket para validar la conexion.',
      };
    }
    return { ok: false, latencyMs: Date.now() - started, message: err.message, code: err.code };
  }
}

async function listBuckets(conn) {
  const res = await call(conn, { method: 'GET' });
  return tagBlocks(res.body, 'Bucket')
    .map((block) => ({
      name: tagValue(block, 'Name'),
      creationDate: tagValue(block, 'CreationDate'),
    }))
    .filter((b) => b.name);
}

async function headObject(conn, bucket, key) {
  const res = await call(conn, { method: 'HEAD', bucket, key });
  return {
    size: Number(res.headers['content-length'] || 0),
    contentType: res.headers['content-type'],
    lastModified: res.headers['last-modified'],
    etag: (res.headers.etag || '').replace(/"/g, ''),
  };
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Upload a local file. SigV4 needs the payload hash up front, so the file is
 * read twice: once to hash, once to stream. That keeps memory flat regardless
 * of file size and works on endpoints that reject UNSIGNED-PAYLOAD.
 */
async function putFile(conn, bucket, key, filePath, contentType) {
  const { size } = fs.statSync(filePath);
  const payloadHash = await hashFile(filePath);
  await call(
    conn,
    {
      method: 'PUT',
      bucket,
      key,
      payloadHash,
      contentLength: size,
      headers: contentType ? { 'content-type': contentType } : {},
    },
    { bodyStream: fs.createReadStream(filePath) }
  );
  return { key, size };
}

async function getObjectToFile(conn, bucket, key, destination) {
  await call(conn, { method: 'GET', bucket, key }, { toFile: destination });
  return { key, path: destination };
}

async function deleteObject(conn, bucket, key) {
  await call(conn, { method: 'DELETE', bucket, key });
  return { key };
}

/** Delete up to 1000 keys per request, which is the S3 batch ceiling. */
async function deleteObjects(conn, bucket, keys) {
  const results = { deleted: 0, errors: [] };
  for (let i = 0; i < keys.length; i += 1000) {
    const batch = keys.slice(i, i + 1000);
    const body = Buffer.from(
      `<?xml version="1.0" encoding="UTF-8"?><Delete><Quiet>true</Quiet>${batch
        .map((k) => `<Object><Key>${escapeXml(k)}</Key></Object>`)
        .join('')}</Delete>`,
      'utf8'
    );
    const res = await call(
      conn,
      {
        method: 'POST',
        bucket,
        query: { delete: '' },
        payloadHash: sha256Hex(body),
        contentLength: body.length,
        headers: {
          'content-type': 'application/xml',
          'content-md5': crypto.createHash('md5').update(body).digest('base64'),
        },
      },
      { body }
    );
    const failures = tagBlocks(res.body, 'Error').map((block) => ({
      key: decodeKey(tagValue(block, 'Key')),
      code: tagValue(block, 'Code'),
      message: tagValue(block, 'Message'),
    }));
    results.errors.push(...failures);
    results.deleted += batch.length - failures.length;
  }
  return results;
}

/** Create the zero-byte, slash-terminated key that stands in for a folder. */
async function createFolder(conn, bucket, key) {
  const normalised = key.endsWith('/') ? key : `${key}/`;
  await call(conn, {
    method: 'PUT',
    bucket,
    key: normalised,
    payloadHash: EMPTY_SHA256,
    contentLength: 0,
  });
  return { key: normalised };
}

/** Delete every key under a prefix, paging through the listing as it goes. */
async function deletePrefix(conn, bucket, prefix) {
  let token;
  const summary = { deleted: 0, errors: [] };
  do {
    const page = await listObjects(conn, { bucket, prefix, delimiter: '', token, maxKeys: 1000 });
    const keys = page.objects.map((o) => o.key);
    if (keys.length) {
      const res = await deleteObjects(conn, bucket, keys);
      summary.deleted += res.deleted;
      summary.errors.push(...res.errors);
    }
    token = page.truncated ? page.nextToken : null;
  } while (token);

  // The placeholder key itself is not returned by a delimited listing.
  try {
    await deleteObject(conn, bucket, prefix.endsWith('/') ? prefix : `${prefix}/`);
    summary.deleted += 1;
  } catch {
    /* no placeholder, nothing to clean up */
  }
  return summary;
}

async function copyObject(conn, bucket, sourceKey, targetKey) {
  await call(conn, {
    method: 'PUT',
    bucket,
    key: targetKey,
    payloadHash: EMPTY_SHA256,
    contentLength: 0,
    headers: { 'x-amz-copy-source': `/${bucket}/${uriEncode(sourceKey, false)}` },
  });
  return { key: targetKey };
}

async function renameObject(conn, bucket, sourceKey, targetKey) {
  await copyObject(conn, bucket, sourceKey, targetKey);
  await deleteObject(conn, bucket, sourceKey);
  return { from: sourceKey, to: targetKey };
}

/** Walk a whole prefix to total size and object count, for the drive summary. */
async function prefixUsage(conn, bucket, prefix = '') {
  let token;
  let bytes = 0;
  let count = 0;
  do {
    const page = await listObjects(conn, { bucket, prefix, delimiter: '', token, maxKeys: 1000 });
    for (const obj of page.objects) {
      bytes += obj.size;
      count += 1;
    }
    token = page.truncated ? page.nextToken : null;
  } while (token);
  return { bytes, count };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  testConnection,
  listBuckets,
  listObjects,
  headObject,
  putFile,
  getObjectToFile,
  deleteObject,
  deleteObjects,
  deletePrefix,
  createFolder,
  copyObject,
  renameObject,
  prefixUsage,
};
