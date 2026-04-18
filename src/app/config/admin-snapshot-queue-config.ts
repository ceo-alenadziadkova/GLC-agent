/**
 * Admin snapshot queue page — fetch size and cache policy (static front config).
 */

import { GLC_QUERY_STALE_TIME_MS_ADMIN_SNAPSHOT_QUEUE } from './query-client-defaults';

export const ADMIN_SNAPSHOT_QUEUE_CONFIG = {
  /** Wide fetch for admin triage; not the same as default audits pagination. */
  listAuditsLimit: 500,
  listAuditsOffset: 0,
  staleTimeMs: GLC_QUERY_STALE_TIME_MS_ADMIN_SNAPSHOT_QUEUE,
} as const;
