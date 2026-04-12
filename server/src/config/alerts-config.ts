/**
 * Pipeline alert worker tuning. Source of truth: `SYSTEM_DEFAULTS.alerts`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const D = SYSTEM_DEFAULTS.alerts;

/** Rolling window (minutes) for pipeline event samples in alert checks. */
export const ALERT_CHECK_WINDOW_MINUTES = D.windowMinutes;

/** Worker tick interval (ms). */
export const ALERT_CHECK_INTERVAL_MS = D.intervalMs;

/** Background idempotency-key cleanup interval (ms). */
export const IDEMPOTENCY_CLEANUP_INTERVAL_MS = D.intervalMs * D.idempotencyCleanupTickMultiplier;

/** Failure rate (failed starts / started) above which to notify. */
export const ALERT_FAILURE_RATE_THRESHOLD = D.failureRateThreshold;

/** Phase duration p95 above which to notify (ms). */
export const ALERT_LATENCY_P95_MS_THRESHOLD = D.latencyP95MsThreshold;

/** Sum of token_usage in window above which to notify. */
export const ALERT_TOKEN_BURN_THRESHOLD = D.tokenBurn15mThreshold;

/** Per-alert-key cooldown (ms). */
export const ALERT_COOLDOWN_MS = D.cooldownMs;

/** Redis distributed lock TTL for alert worker (ms). */
export const ALERT_LOCK_TTL_MS = D.lockTtlMs;
