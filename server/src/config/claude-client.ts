/**
 * Claude API client resilience: retries, timeouts, circuit breaker key.
 * Source of truth: `SYSTEM_DEFAULTS.claudeHttp`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const C = SYSTEM_DEFAULTS.claudeHttp;

export const CLAUDE_MAX_RETRIES = C.maxRetries;

export const CLAUDE_RETRY_BASE_MS = C.retryBaseMs;

/** Upper bound (exclusive) for random jitter added to exponential backoff in `BaseAgent`. */
export const CLAUDE_RETRY_JITTER_MS = C.retryJitterMs;

export const CLAUDE_TIMEOUT_MS = C.timeoutMs;

export const CLAUDE_CB_THRESHOLD = C.cbThreshold;

export const CLAUDE_CB_TTL_SEC = C.cbTtlSec;

export function claudeCircuitBreakerRedisKey(): string {
  const p = process.env.REDIS_KEY_PREFIX?.trim().replace(/:+$/, '');
  return p ? `${p}:cb:claude:failures` : 'cb:claude:failures';
}
