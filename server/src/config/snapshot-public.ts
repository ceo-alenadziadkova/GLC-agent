/**
 * Env-driven defaults for public snapshot routes (`/api/snapshot`).
 */

import { parsePositiveIntFromEnv } from './rate-limits.js';

/** Token budget stored on snapshot audits when env unset (default 80_000). */
export function getFreeSnapshotTokenBudget(): number {
  const n = Number(process.env.FREE_SNAPSHOT_TOKEN_BUDGET);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 80_000;
}

const ttlRaw = Number(process.env.SNAPSHOT_TOKEN_TTL_HOURS ?? 72);
export const SNAPSHOT_TOKEN_TTL_HOURS =
  Number.isFinite(ttlRaw) && ttlRaw > 0 ? Math.floor(ttlRaw) : 72;

/** Guest funnel row `expires_at` offset (default 90 days). */
export function getGuestFunnelRetentionMs(): number {
  const days = parsePositiveIntFromEnv(process.env.SNAPSHOT_GUEST_FUNNEL_RETENTION_DAYS, 90);
  return days * 24 * 60 * 60 * 1000;
}

/** Max stored length for User-Agent / Referer on snapshot guest sessions (PII cap). */
export const SNAPSHOT_GUEST_HEADER_MAX_LEN = parsePositiveIntFromEnv(
  process.env.SNAPSHOT_GUEST_HEADER_MAX_LEN,
  2000,
);

/** Truncate legacy UX summary derived from scan_basis (chars). */
export const SNAPSHOT_UX_SUMMARY_MAX_CHARS = parsePositiveIntFromEnv(
  process.env.SNAPSHOT_UX_SUMMARY_MAX_CHARS,
  280,
);

/** Wall-clock budget for optional competitor mini-build on snapshot GET. */
export const SNAPSHOT_COMPETITOR_TIMEOUT_MS = parsePositiveIntFromEnv(
  process.env.SNAPSHOT_COMPETITOR_TIMEOUT_MS,
  3000,
);
