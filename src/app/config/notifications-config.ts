/**
 * Notifications center — list caps and TanStack Query policy (static front config).
 * Aligns with `@glc/route-limits` defaults used by the API.
 */

import { GLC_NOTIFICATIONS_LIST } from '@glc/route-limits';

import { GLC_QUERY_STALE_TIME_MS_NOTIFICATIONS } from './query-client-defaults';

export const NOTIFICATIONS_CENTER_CONFIG = {
  /** Matches `GLC_NOTIFICATIONS_LIST.defaultLimit` / server route default. */
  listPageSize: GLC_NOTIFICATIONS_LIST.defaultLimit,
  listOffset: 0,
  staleTimeMs: GLC_QUERY_STALE_TIME_MS_NOTIFICATIONS,
  /** Max items kept in the React Query cache after realtime inserts. */
  realtimeClientCap: 50,
} as const;
