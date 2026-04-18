/**
 * Infrastructure Redis URLs (ENV). Single place for variable names; middleware and services import these readers.
 */

/** Redis for express-rate-limit shared store (`RATE_LIMIT_REDIS_URL`). */
export function getRateLimitRedisUrl(): string {
  return process.env.RATE_LIMIT_REDIS_URL?.trim() ?? '';
}

/** When true, production refuses to start without `RATE_LIMIT_REDIS_URL`. */
export function isStrictRateLimitRedis(): boolean {
  return String(process.env.STRICT_RATE_LIMIT_REDIS ?? '').toLowerCase() === 'true';
}

/** Dedicated queue Redis, else shared with rate-limit Redis. */
export function getPipelineQueueRedisUrl(): string {
  return process.env.PIPELINE_QUEUE_REDIS_URL?.trim() ?? '';
}

/** Redis URL for pipeline worker / shared jobs: queue URL first, then rate-limit URL. */
export function getPipelineWorkerRedisUrl(): string {
  return getPipelineQueueRedisUrl() || getRateLimitRedisUrl();
}

/**
 * Redis for distributed Claude circuit-breaker counters.
 * Infra: optional `CLAUDE_CIRCUIT_REDIS_URL`, else `RATE_LIMIT_REDIS_URL`.
 */
export function getClaudeCircuitRedisUrl(): string {
  return (process.env.CLAUDE_CIRCUIT_REDIS_URL?.trim() || getRateLimitRedisUrl()) ?? '';
}
