/**
 * Centralized rate-limit numeric defaults and env parsing.
 * Used by `server/src/middleware/rate-limit.ts`.
 */

export const HOUR_MS = 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

export function parsePositiveIntFromEnv(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Audit creation: max requests per rolling window (default 5 per 24h). */
export const RATE_LIMIT_AUDIT_CREATE_MAX_PER_DAY = parsePositiveIntFromEnv(
  process.env.RATE_LIMIT_AUDIT_CREATE_MAX_PER_DAY,
  5,
);
export const RATE_LIMIT_AUDIT_CREATE_WINDOW_MS =
  parsePositiveIntFromEnv(process.env.RATE_LIMIT_AUDIT_CREATE_WINDOW_HOURS, 24) * HOUR_MS;

/** Pipeline start/next: max per rolling window (default 30 per hour). */
export const RATE_LIMIT_PIPELINE_MAX_PER_WINDOW = parsePositiveIntFromEnv(
  process.env.RATE_LIMIT_PIPELINE_MAX_PER_HOUR,
  30,
);
export const RATE_LIMIT_PIPELINE_WINDOW_MS =
  parsePositiveIntFromEnv(process.env.RATE_LIMIT_PIPELINE_WINDOW_MINUTES, 60) * MINUTE_MS;

/** General authenticated API: max per rolling window (default 100 per minute). */
export const RATE_LIMIT_GENERAL_MAX_PER_WINDOW = parsePositiveIntFromEnv(
  process.env.RATE_LIMIT_GENERAL_MAX_PER_MIN,
  100,
);
export const RATE_LIMIT_GENERAL_WINDOW_MS =
  parsePositiveIntFromEnv(process.env.RATE_LIMIT_GENERAL_WINDOW_SECONDS, 60) * 1000;

/** Free snapshot POST starts per IP per rolling window (abuse control). */
export const SNAPSHOT_PUBLIC_MAX_PER_DAY = parsePositiveIntFromEnv(
  process.env.RATE_LIMIT_SNAPSHOT_PUBLIC_MAX_PER_DAY,
  3,
);
export const SNAPSHOT_PUBLIC_WINDOW_MS =
  parsePositiveIntFromEnv(process.env.RATE_LIMIT_SNAPSHOT_PUBLIC_WINDOW_HOURS, 24) * HOUR_MS;

/** Authenticated client log ingest. */
export const RATE_LIMIT_LOG_INGEST_MAX_PER_WINDOW = parsePositiveIntFromEnv(
  process.env.RATE_LIMIT_LOG_INGEST_MAX_PER_MIN,
  180,
);
export const RATE_LIMIT_LOG_INGEST_WINDOW_MS =
  parsePositiveIntFromEnv(process.env.RATE_LIMIT_LOG_INGEST_WINDOW_SECONDS, 60) * 1000;

const snapshotCompareRaw = Number(process.env.SNAPSHOT_COMPARE_MAX_PER_HOUR ?? 15);
export const SNAPSHOT_COMPARE_MAX_PER_HOUR =
  Number.isFinite(snapshotCompareRaw) && snapshotCompareRaw > 0 ? Math.floor(snapshotCompareRaw) : 15;

const snapshotLogRaw = Number(process.env.SNAPSHOT_LOG_INGEST_MAX_PER_MIN ?? 40);
export const SNAPSHOT_LOG_INGEST_MAX_PER_MIN =
  Number.isFinite(snapshotLogRaw) && snapshotLogRaw > 0 ? Math.floor(snapshotLogRaw) : 40;
