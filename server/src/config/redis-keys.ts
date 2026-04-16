/**
 * Redis key fragments after optional `REDIS_KEY_PREFIX` (infrastructure env).
 * Centralises operational segments used by rate limiting, locks, and circuit breaker.
 */

/** Trimmed `REDIS_KEY_PREFIX` without trailing colons, or empty when unset. */
export function getRedisKeyPrefixSegment(): string {
  return (process.env.REDIS_KEY_PREFIX?.trim().replace(/:+$/, '') ?? '');
}

/** Prefix for nested keys: `"tenant:"` or `""` when no env prefix. */
export function getRedisKeyPrefixWithColon(): string {
  const s = getRedisKeyPrefixSegment();
  return s ? `${s}:` : '';
}

export const REDIS_KEYS = {
  claudeCircuitBreakerFailures: 'cb:claude:failures',
  alertsRunLock: 'lock:alerts:run',
  banditsRecomputeLock: 'lock:bandits:recompute',
  /** Segment in rate-limit store keys: `{prefix}{namespace}:{routePrefix}:` */
  rateLimitNamespace: 'glc',
} as const;
