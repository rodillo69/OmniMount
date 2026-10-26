'use strict';

/**
 * Defaults for new connections and mounts.
 *
 * Nothing here is tied to a particular provider. The endpoint is supplied by
 * the user, so the same build works against AWS, MinIO, Wasabi, Backblaze,
 * NetApp StorageGRID or any other S3-compatible service.
 */

/**
 * S3 options that are safe for the widest range of servers.
 *
 * `provider = Other` is rclone's generic S3 profile. A named provider enables
 * vendor-specific behaviour that breaks on everything else, so the generic one
 * is the right default and the user can refine it later.
 *
 * `forcePathStyle` puts the bucket in the path rather than the hostname.
 * Virtual-host addressing needs a wildcard DNS record and a matching
 * certificate, which most self-hosted S3 services do not have. Path-style
 * works everywhere, including on AWS.
 *
 * `noCheckBucket` stops rclone probing or creating the bucket when mounting.
 * Keys scoped to a single bucket usually cannot list or create buckets, and
 * without this the mount fails for a permission the user does not need.
 */
const S3 = {
  provider: 'Other',
  signingRegion: 'us-east-1',
  forcePathStyle: true,
  noCheckBucket: true,
};

/** Mount settings that behave well for a general-purpose working drive. */
const MOUNT = {
  // Mounted as a network drive, Explorer always appends a "(\\server\share)"
  // suffix that cannot be removed, and leaves stale entries behind when the
  // drive goes away. As an ordinary drive it shows just the label.
  networkMode: false,
  // Remote storage has no fixed quota, and rclone reports 1 PB by default,
  // which Explorer renders as "1024 TB free" and looks like a fault. A
  // plausible figure reads better and limits nothing a normal copy would hit.
  reportedSizeTB: 1,
  cacheMode: 'full',
  cacheMaxSizeGB: 10,
  cacheMaxAgeHours: 24,
  dirCacheSeconds: 30,
  transfers: 8,
  checkers: 8,
  bandwidthLimit: '',
  autoRestart: true,
  extraFlags: '',
};

/** Drive letters offered first. The tail of the alphabet is conventional. */
const PREFERRED_LETTERS = ['S', 'T', 'U', 'V', 'W', 'Y', 'Z'];

module.exports = { S3, MOUNT, PREFERRED_LETTERS };
