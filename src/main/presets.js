'use strict';

/**
 * Known providers, so a service with fixed addresses can be chosen by name.
 *
 * rclone describes what a backend *can* do, but not where any particular
 * company's servers are. A preset fills that gap: pick the provider and the
 * endpoint, addressing style and signing region are set correctly, instead of
 * being pasted from a support ticket.
 *
 * A preset never adds capability — everything here can be typed by hand by
 * choosing the generic type and filling the fields. It only removes the part
 * that is easy to get wrong.
 */

/**
 * Regions are a property of a provider, not of the app.
 *
 * Most S3 services have one address; some have one per datacentre, and the
 * credentials issued for one do not work against another. Where that is the
 * case the preset lists them, and the form asks which one rather than asking
 * for a URL.
 */
const PRESETS = [
  {
    id: 'airecloud',
    label: 'AireCloud',
    type: 's3',
    // NetApp StorageGRID behind an S3-compatible API. StorageGRID is not one
    // of rclone's named providers, and its generic profile is the correct one.
    config: {
      provider: 'Other',
      // Virtual-host addressing needs a wildcard DNS record and a matching
      // certificate, which this service does not publish.
      force_path_style: 'true',
      // Keys are scoped to a bucket and cannot list or create buckets, so the
      // probe rclone does by default fails on a permission nobody needs.
      no_check_bucket: 'true',
      region: 'us-east-1',
    },
    regions: [
      {
        id: 'eqx',
        label: 'Equinix',
        endpoint: 'https://s3-eqx.airetech.es',
      },
      {
        id: 'abz',
        label: 'Albasanz',
        endpoint: 'https://s3-abz.airetech.es',
      },
    ],
  },
];

/** Presets that apply to a given backend type. */
function forType(type) {
  return PRESETS.filter((p) => p.type === type).map((p) => ({
    id: p.id,
    label: p.label,
    config: p.config,
    regions: p.regions || [],
  }));
}

/** All of them, keyed by the backend they belong to. */
function all() {
  const byType = {};
  for (const preset of PRESETS) {
    byType[preset.type] = byType[preset.type] || [];
    byType[preset.type].push({
      id: preset.id,
      label: preset.label,
      config: preset.config,
      regions: preset.regions || [],
    });
  }
  return byType;
}

module.exports = { forType, all, PRESETS };
