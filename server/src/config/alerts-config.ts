/**
 * Pipeline alert worker tuning: defaults from `system-defaults.ts`, optional env overrides
 * (`ALERT_*` — ops / observability).
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const D = SYSTEM_DEFAULTS.alerts;

export function readAlertWindowMinutes(): number {
  const raw = process.env.ALERT_WINDOW_MINUTES?.trim();
  if (!raw) return D.windowMinutes;
  const n = Number(raw);
  if (!Number.isFinite(n)) return D.windowMinutes;
  const m = Math.floor(n);
  if (m < D.windowMinutesMin || m > D.windowMinutesMax) return D.windowMinutes;
  return m;
}

function readPositiveMsEnv(key: string, fallback: number): number {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Rolling window (minutes) for pipeline event samples in alert checks. */
export const ALERT_CHECK_WINDOW_MINUTES = readAlertWindowMinutes();

/** Worker tick interval (ms). */
export const ALERT_CHECK_INTERVAL_MS = readPositiveMsEnv('ALERT_INTERVAL_MS', D.intervalMs);

/** Failure rate (failed starts / started) above which to notify. */
export const ALERT_FAILURE_RATE_THRESHOLD = (() => {
  const raw = process.env.ALERT_FAILURE_RATE_THRESHOLD?.trim();
  if (!raw) return D.failureRateThreshold;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : D.failureRateThreshold;
})();

/** Phase duration p95 above which to notify (ms). */
export const ALERT_LATENCY_P95_MS_THRESHOLD = readPositiveMsEnv(
  'ALERT_LATENCY_P95_MS_THRESHOLD',
  D.latencyP95MsThreshold,
);

/** Sum of token_usage in window above which to notify. */
export const ALERT_TOKEN_BURN_THRESHOLD = readPositiveMsEnv(
  'ALERT_TOKEN_BURN_15M_THRESHOLD',
  D.tokenBurn15mThreshold,
);

/** Per-alert-key cooldown (ms). */
export const ALERT_COOLDOWN_MS = readPositiveMsEnv('ALERT_COOLDOWN_MS', D.cooldownMs);

/** Redis distributed lock TTL for alert worker (ms). */
export const ALERT_LOCK_TTL_MS = readPositiveMsEnv('ALERT_LOCK_TTL_MS', D.lockTtlMs);
