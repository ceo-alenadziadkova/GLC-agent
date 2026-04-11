/**
 * Claude API client resilience: retries, timeouts, circuit breaker key.
 * Env vars mirror previous defaults in `agents/base.ts`.
 */

function readPositiveIntMin1(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

function readPositiveMs(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const CLAUDE_MAX_RETRIES = readPositiveIntMin1(process.env.CLAUDE_MAX_RETRIES, 3);

export const CLAUDE_RETRY_BASE_MS = readPositiveMs(process.env.CLAUDE_RETRY_BASE_MS, 1500);

/** Upper bound (exclusive) for random jitter added to exponential backoff in `BaseAgent`. */
export const CLAUDE_RETRY_JITTER_MS = readPositiveMs(process.env.CLAUDE_RETRY_JITTER_MS, 300);

export const CLAUDE_TIMEOUT_MS = readPositiveMs(process.env.CLAUDE_TIMEOUT_MS, 90_000);

export const CLAUDE_CB_THRESHOLD = readPositiveIntMin1(process.env.CLAUDE_CB_THRESHOLD, 3);

export const CLAUDE_CB_TTL_SEC = readPositiveIntMin1(process.env.CLAUDE_CB_TTL_SEC, 60);

export function claudeCircuitBreakerRedisKey(): string {
  const p = process.env.REDIS_KEY_PREFIX?.trim().replace(/:+$/, '');
  return p ? `${p}:cb:claude:failures` : 'cb:claude:failures';
}
