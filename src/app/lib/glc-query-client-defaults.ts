/**
 * Defaults for TanStack Query in the SPA (`src/app/config/query-client-defaults.ts`).
 */

import {
  GLC_QUERY_DEFAULT_RETRY_DEFAULT,
  GLC_QUERY_GC_TIME_MS_DEFAULT,
  GLC_QUERY_STALE_TIME_MS_DEFAULT,
} from '../config/query-client-defaults';

export function glcQueryDefaultRetry(): number | boolean {
  return GLC_QUERY_DEFAULT_RETRY_DEFAULT;
}

export const GLC_QUERY_STALE_TIME_MS = GLC_QUERY_STALE_TIME_MS_DEFAULT;

export const GLC_QUERY_GC_TIME_MS = GLC_QUERY_GC_TIME_MS_DEFAULT;
