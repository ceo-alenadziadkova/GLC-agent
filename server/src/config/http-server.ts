/**
 * Express HTTP server tuning.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

/** Mounted under this prefix in `index.ts` (middleware cache skip uses the same string). */
export const API_PREFIX = '/api' as const;

export const API_HEALTH_PATH = `${API_PREFIX}/health` as const;

/** Max JSON body size for `express.json()`. */
export function getExpressJsonBodyLimit(): string {
  return SYSTEM_DEFAULTS.express.jsonBodyLimit;
}

/**
 * Default HTTP bind address (Docker/Railway-friendly). Override with `LISTEN_HOST` for local hardening.
 */
export const DEFAULT_LISTEN_HOST = '0.0.0.0' as const;
