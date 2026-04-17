/**
 * Consultant audits list — default pagination aligned with `@glc/route-limits`.
 */

import { GLC_AUDITS_AND_AUDIT_REQUESTS_LIST } from '@glc/route-limits';

import { GLC_QUERY_STALE_TIME_MS_DEFAULT } from './query-client-defaults';

export const AUDITS_LIST_DEFAULTS = {
  defaultLimit: GLC_AUDITS_AND_AUDIT_REQUESTS_LIST.defaultLimit,
  staleTimeMs: GLC_QUERY_STALE_TIME_MS_DEFAULT,
} as const;
