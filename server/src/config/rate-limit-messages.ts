/**
 * English copy for express-rate-limit JSON bodies (429). Edit `rate-limit-messages.en.json`.
 */

import raw from './rate-limit-messages.en.json' with { type: 'json' };

export function rateLimitAuditCreateMessage(maxPerWindow: number): string {
  return raw.AUDIT_CREATE.replace(/\{max\}/g, String(maxPerWindow));
}

export function rateLimitSnapshotPublicDailyCapMessage(dailyLimit: number): string {
  return raw.SNAPSHOT_PUBLIC_DAILY_CAP.replace(/\{limit\}/g, String(dailyLimit));
}

export const RATE_LIMIT_PIPELINE_MESSAGE = raw.PIPELINE;
export const RATE_LIMIT_GENERAL_MESSAGE = raw.GENERAL;
export const RATE_LIMIT_COMPARE_MESSAGE = raw.COMPARE;
export const RATE_LIMIT_INTAKE_LEGACY_MESSAGE = raw.INTAKE_LEGACY;
export const RATE_LIMIT_DISCOVER_CREATE_MESSAGE = raw.DISCOVER_CREATE;
export const RATE_LIMIT_DISCOVER_READ_MESSAGE = raw.DISCOVER_READ;
export const RATE_LIMIT_DISCOVER_ANALYTICS_MESSAGE = raw.DISCOVER_ANALYTICS;
export const RATE_LIMIT_BRIEF_PUBLIC_CREATE_MESSAGE = raw.BRIEF_PUBLIC_CREATE;
export const RATE_LIMIT_BRIEF_PUBLIC_READ_MESSAGE = raw.BRIEF_PUBLIC_READ;
export const RATE_LIMIT_BRIEF_PUBLIC_WRITE_MESSAGE = raw.BRIEF_PUBLIC_WRITE;
export const RATE_LIMIT_INTAKE_READ_MESSAGE = raw.INTAKE_READ;
export const RATE_LIMIT_INTAKE_WRITE_MESSAGE = raw.INTAKE_WRITE;
export const RATE_LIMIT_MARKETING_BRIEF_MESSAGE = raw.MARKETING_BRIEF;
export const RATE_LIMIT_LOG_INGEST_MESSAGE = raw.LOG_INGEST;
export const RATE_LIMIT_SNAPSHOT_LOG_INGEST_MESSAGE = raw.SNAPSHOT_LOG_INGEST;
export const RATE_LIMIT_BENCHMARK_RECOMPUTE_MESSAGE = raw.BENCHMARK_RECOMPUTE;
