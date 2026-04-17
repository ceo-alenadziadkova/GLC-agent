import { SNAPSHOT_MAX_EXTRA_PAGES } from '../../config/snapshot-timing.js';

/**
 * When homepage fetch is robots-blocked, we scan only a bounded number of fallback paths.
 * Keep this derived from global extra-pages cap to preserve API expectations.
 */
export const SNAPSHOT_ROBOTS_FALLBACK_MAX_HTML_PAGES = SNAPSHOT_MAX_EXTRA_PAGES + 1;

export const SNAPSHOT_PAGE_ROLE_PATTERNS = {
  contact: /\/contact\b/i,
  pricing: /\/pricing|\/plans|\/subscribe|\/billing\b/i,
  about: /\/about|\/team|\/company\b/i,
  services: /\/services?\b/i,
} as const;

export const SNAPSHOT_PATH_PRIORITY_POLICY = {
  hintMatchScore: 3,
  shallowPathDepthMax: 2,
  shallowPathScore: 1,
} as const;
