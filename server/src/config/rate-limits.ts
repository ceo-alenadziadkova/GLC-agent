/**
 * Centralized rate-limit numerics for authenticated and snapshot routes.
 * Source of truth: `SYSTEM_DEFAULTS.rateLimits`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const RL = SYSTEM_DEFAULTS.rateLimits;

export const HOUR_MS = 60 * 60 * 1000;
export const MINUTE_MS = 60 * 1000;

/** Parse a positive int from env-style input (tests / future tooling). */
export function parsePositiveIntFromEnv(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const RATE_LIMIT_AUDIT_CREATE_MAX_PER_DAY = RL.auditCreateMaxPerDay;
export const RATE_LIMIT_AUDIT_CREATE_WINDOW_MS = RL.auditCreateWindowHours * HOUR_MS;

export const RATE_LIMIT_PIPELINE_MAX_PER_WINDOW = RL.pipelineMaxPerHour;
export const RATE_LIMIT_PIPELINE_WINDOW_MS = RL.pipelineWindowMinutes * MINUTE_MS;

export const RATE_LIMIT_GENERAL_MAX_PER_WINDOW = RL.generalMaxPerMin;
export const RATE_LIMIT_GENERAL_WINDOW_MS = RL.generalWindowSeconds * 1000;

export const RATE_LIMIT_REPORT_PDF_MAX_PER_WINDOW = RL.reportPdfMaxPerMin;
export const RATE_LIMIT_REPORT_PDF_WINDOW_MS = RL.reportPdfWindowSeconds * 1000;

export const SNAPSHOT_PUBLIC_MAX_PER_DAY = RL.snapshotPublicMaxPerDay;
export const SNAPSHOT_PUBLIC_WINDOW_MS = RL.snapshotPublicWindowHours * HOUR_MS;

export const RATE_LIMIT_LOG_INGEST_MAX_PER_WINDOW = RL.logIngestMaxPerMin;
export const RATE_LIMIT_LOG_INGEST_WINDOW_MS = RL.logIngestWindowSeconds * 1000;

export const SNAPSHOT_COMPARE_MAX_PER_HOUR = RL.snapshotCompareMaxPerHour;
export const SNAPSHOT_COMPARE_WINDOW_MS = RL.snapshotCompareWindowHours * HOUR_MS;

export const SNAPSHOT_LOG_INGEST_MAX_PER_MIN = RL.snapshotLogIngestMaxPerMin;

export const RATE_LIMIT_BENCHMARK_RECOMPUTE_MAX_PER_WINDOW = RL.benchmarkRecomputeMaxPerHour;
export const RATE_LIMIT_BENCHMARK_RECOMPUTE_WINDOW_MS = HOUR_MS;
