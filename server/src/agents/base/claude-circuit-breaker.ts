/**
 * Distributed + local fallback circuit breaker for Claude API failures.
 */

import { createClient } from 'redis';

import {
  CLAUDE_CB_TTL_SEC,
  claudeCircuitBreakerRedisKey,
  getClaudeCircuitRedisUrl,
} from '../../config/claude-client.js';
import { logger } from '../../services/logger.js';

let localCircuitFailures = 0;
type ClaudeCircuitRedisClient = ReturnType<typeof createClient>;
let claudeCircuitRedis: ClaudeCircuitRedisClient | null = null;

function getClaudeCircuitRedisClient(): ClaudeCircuitRedisClient | null {
  const redisUrl = getClaudeCircuitRedisUrl();
  if (!redisUrl) return null;
  if (claudeCircuitRedis) return claudeCircuitRedis;
  const client = createClient({ url: redisUrl });
  client.on('error', (err) => {
    logger.warn('claude.circuit.redis_error', {
      component: 'agent',
      error: err instanceof Error ? err.message : String(err),
    });
  });
  void client.connect();
  claudeCircuitRedis = client;
  return client;
}

export async function getConsecutiveClaudeFailures(): Promise<number> {
  const client = getClaudeCircuitRedisClient();
  if (!client) return localCircuitFailures;
  try {
    const raw = await client.get(claudeCircuitBreakerRedisKey());
    const parsed = Number(raw ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return localCircuitFailures;
  }
}

export async function recordClaudeFailure(): Promise<void> {
  localCircuitFailures += 1;
  const client = getClaudeCircuitRedisClient();
  if (!client) return;
  try {
    const key = claudeCircuitBreakerRedisKey();
    const n = await client.incr(key);
    if (n === 1) {
      await client.expire(key, CLAUDE_CB_TTL_SEC);
    }
  } catch {
    // Best-effort only; local fallback remains active.
  }
}

export async function resetClaudeFailures(): Promise<void> {
  localCircuitFailures = 0;
  const client = getClaudeCircuitRedisClient();
  if (!client) return;
  try {
    await client.del(claudeCircuitBreakerRedisKey());
  } catch {
    // Best-effort only.
  }
}
