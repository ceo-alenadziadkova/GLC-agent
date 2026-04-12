/**
 * Claude API client resilience: retries, timeouts, circuit breaker key.
 * Source of truth: `SYSTEM_DEFAULTS.claudeHttp`.
 */

import Anthropic from '@anthropic-ai/sdk';

import { REDIS_KEYS } from './redis-keys.js';
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
  return p ? `${p}:${REDIS_KEYS.claudeCircuitBreakerFailures}` : REDIS_KEYS.claudeCircuitBreakerFailures;
}

/**
 * Anthropic SDK client. Optional `ANTHROPIC_BASE_URL` (infra) for corporate proxy or compatible API gateway.
 */
export function createAnthropicClient(): Anthropic {
  const baseURL = process.env.ANTHROPIC_BASE_URL?.trim();
  if (baseURL) {
    return new Anthropic({ baseURL });
  }
  return new Anthropic();
}
