/**
 * Admin request queue — TanStack Query policy (static front config).
 */

import { GLC_QUERY_STALE_TIME_MS_LONG_ADMIN_LISTS } from './query-client-defaults';

export const ADMIN_REQUEST_QUEUE_QUERY_CONFIG = {
  staleTimeMs: GLC_QUERY_STALE_TIME_MS_LONG_ADMIN_LISTS,
} as const;
