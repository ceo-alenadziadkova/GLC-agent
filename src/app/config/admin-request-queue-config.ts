/**
 * Admin request queue — TanStack Query policy (static front config).
 */

import { GLC_QUERY_STALE_TIME_MS_LONG_ADMIN_LISTS } from './query-client-defaults';

export const ADMIN_REQUEST_QUEUE_QUERY_CONFIG = {
  staleTimeMs: GLC_QUERY_STALE_TIME_MS_LONG_ADMIN_LISTS,
} as const;

/** Display formatting and row preview (not API secrets). */
export const ADMIN_REQUEST_QUEUE_DISPLAY = {
  /** Locale for audit-request created_at row dates. */
  dateLocale: 'en-GB',
  /** Visible prefix length for client_id in queue rows. */
  clientIdPreviewLength: 8,
  /**
   * Industry option label meaning "specify other" in the intake question bank (`a2`).
   * Keep aligned with `packages/intake-core` / `docs/QUESTION_BANK.md`.
   */
  industryOtherLabel: 'Other',
} as const;
