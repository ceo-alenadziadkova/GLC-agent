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
 * Redis URL for distributed Claude circuit-breaker counters.
 * Infra: optional `CLAUDE_CIRCUIT_REDIS_URL`, else falls back to `RATE_LIMIT_REDIS_URL`.
 */
export function getClaudeCircuitRedisUrl(): string {
  return (process.env.CLAUDE_CIRCUIT_REDIS_URL?.trim() || process.env.RATE_LIMIT_REDIS_URL?.trim()) ?? '';
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
