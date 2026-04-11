/**
 * Defaults for public snapshot routes (`/api/snapshot`).
 * Source of truth: `SYSTEM_DEFAULTS.snapshotPublic`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const SP = SYSTEM_DEFAULTS.snapshotPublic;

/** Token budget stored on new `free_snapshot` audits. */
export function getFreeSnapshotTokenBudget(): number {
  return SP.freeSnapshotTokenBudget;
}

export const SNAPSHOT_TOKEN_TTL_HOURS = SP.tokenTtlHours;

/** Guest funnel row `expires_at` offset. */
export function getGuestFunnelRetentionMs(): number {
  return SP.guestFunnelRetentionDays * 24 * 60 * 60 * 1000;
}

/** Max stored length for User-Agent / Referer on snapshot guest sessions (PII cap). */
export const SNAPSHOT_GUEST_HEADER_MAX_LEN = SP.guestHeaderMaxLen;

/** Truncate legacy UX summary derived from scan_basis (chars). */
export const SNAPSHOT_UX_SUMMARY_MAX_CHARS = SP.uxSummaryMaxChars;

/** Wall-clock budget for optional competitor mini-build on snapshot GET. */
export const SNAPSHOT_COMPETITOR_TIMEOUT_MS = SP.competitorTimeoutMs;
