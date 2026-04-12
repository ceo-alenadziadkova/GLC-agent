/**
 * Redis key fragments after optional `REDIS_KEY_PREFIX` (infrastructure env).
 * Centralises operational segments used by rate limiting, locks, and circuit breaker.
 */

export const REDIS_KEYS = {
  claudeCircuitBreakerFailures: 'cb:claude:failures',
  alertsRunLock: 'lock:alerts:run',
  /** Segment in rate-limit store keys: `{prefix}{namespace}:{routePrefix}:` */
  rateLimitNamespace: 'glc',
} as const;
