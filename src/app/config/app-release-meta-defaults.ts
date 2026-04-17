/**
 * Static defaults for release/edition labels when VITE_* build vars are unset (front CONFIG layer).
 */

export const APP_RELEASE_META_DEFAULTS = {
  generatedLabel: 'Generated metadata unavailable',
  version: 'dev',
  edition: 'Community',
} as const;
