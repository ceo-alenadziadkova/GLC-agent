/**
 * Centralized rate-limit numeric defaults and env parsing.
 * Used by `server/src/middleware/rate-limit.ts`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const RL = SYSTEM_DEFAULTS.rateLimits;

export const HOUR_MS = 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

export function parsePositiveIntFromEnv(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Audit creation: max requests per rolling window (default 5 per 24h). */
export const RATE_LIMIT_AUDIT_CREATE_MAX_PER_DAY = parsePositiveIntFromEnv(
  process.env.RATE_LIMIT_AUDIT_CREATE_MAX_PER_DAY,
  RL.auditCreateMaxPerDay,
);
export const RATE_LIMIT_AUDIT_CREATE_WINDOW_MS =
  parsePositiveIntFromEnv(process.env.RATE_LIMIT_AUDIT_CREATE_WINDOW_HOURS, RL.auditCreateWindowHours) * HOUR_MS;

/** Pipeline start/next: max per rolling window (default 30 per hour). */
export const RATE_LIMIT_PIPELINE_MAX_PER_WINDOW = parsePositiveIntFromEnv(
  process.env.RATE_LIMIT_PIPELINE_MAX_PER_HOUR,
  RL.pipelineMaxPerHour,
);
export const RATE_LIMIT_PIPELINE_WINDOW_MS =
  parsePositiveIntFromEnv(process.env.RATE_LIMIT_PIPELINE_WINDOW_MINUTES, RL.pipelineWindowMinutes) * MINUTE_MS;

/** General authenticated API: max per rolling window (default 100 per minute). */
export const RATE_LIMIT_GENERAL_MAX_PER_WINDOW = parsePositiveIntFromEnv(
  process.env.RATE_LIMIT_GENERAL_MAX_PER_MIN,
  RL.generalMaxPerMin,
);
export const RATE_LIMIT_GENERAL_WINDOW_MS =
  parsePositiveIntFromEnv(process.env.RATE_LIMIT_GENERAL_WINDOW_SECONDS, RL.generalWindowSeconds) * 1000;

/** Free snapshot POST starts per IP per rolling window (abuse control). */
export const SNAPSHOT_PUBLIC_MAX_PER_DAY = parsePositiveIntFromEnv(
  process.env.RATE_LIMIT_SNAPSHOT_PUBLIC_MAX_PER_DAY,
  RL.snapshotPublicMaxPerDay,
);
export const SNAPSHOT_PUBLIC_WINDOW_MS =
  parsePositiveIntFromEnv(process.env.RATE_LIMIT_SNAPSHOT_PUBLIC_WINDOW_HOURS, RL.snapshotPublicWindowHours) * HOUR_MS;

/** Authenticated client log ingest. */
export const RATE_LIMIT_LOG_INGEST_MAX_PER_WINDOW = parsePositiveIntFromEnv(
  process.env.RATE_LIMIT_LOG_INGEST_MAX_PER_MIN,
  RL.logIngestMaxPerMin,
);
export const RATE_LIMIT_LOG_INGEST_WINDOW_MS =
  parsePositiveIntFromEnv(process.env.RATE_LIMIT_LOG_INGEST_WINDOW_SECONDS, RL.logIngestWindowSeconds) * 1000;

const snapshotCompareRaw = Number(process.env.SNAPSHOT_COMPARE_MAX_PER_HOUR ?? RL.snapshotCompareMaxPerHour);
export const SNAPSHOT_COMPARE_MAX_PER_HOUR =
  Number.isFinite(snapshotCompareRaw) && snapshotCompareRaw > 0
    ? Math.floor(snapshotCompareRaw)
    : RL.snapshotCompareMaxPerHour;

/** Sliding window for GET snapshot competitor/compare abuse (default 1h). */
export const SNAPSHOT_COMPARE_WINDOW_MS =
  parsePositiveIntFromEnv(process.env.RATE_LIMIT_SNAPSHOT_COMPARE_WINDOW_HOURS, RL.snapshotCompareWindowHours) *
  HOUR_MS;

const snapshotLogRaw = Number(process.env.SNAPSHOT_LOG_INGEST_MAX_PER_MIN ?? RL.snapshotLogIngestMaxPerMin);
export const SNAPSHOT_LOG_INGEST_MAX_PER_MIN =
  Number.isFinite(snapshotLogRaw) && snapshotLogRaw > 0
    ? Math.floor(snapshotLogRaw)
    : RL.snapshotLogIngestMaxPerMin;
