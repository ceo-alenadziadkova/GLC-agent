import { acquireRedisTokenLock, releaseRedisTokenLock, type RedisTokenLockHandle } from '../../lib/redis-token-lock.js';
import { getSharedRedisClient } from '../redis.js';
import { REDIS_KEYS } from '../../config/redis-keys.js';
import { PLATFORM_BANDIT_RECOMPUTE_LOCK_TTL_MS } from '../../config/platform-runtime-policy.js';

export class PlatformRecomputeLockUnavailableError extends Error {
  constructor() {
    super('Redis is required for bandit recompute locking');
    this.name = 'PlatformRecomputeLockUnavailableError';
  }
}

export type BanditRecomputeLockHandle = RedisTokenLockHandle;

export async function acquireBanditRecomputeLock(): Promise<BanditRecomputeLockHandle | null> {
  const redis = getSharedRedisClient();
  if (!redis) {
    throw new PlatformRecomputeLockUnavailableError();
  }
  return acquireRedisTokenLock(redis, REDIS_KEYS.banditsRecomputeLock, PLATFORM_BANDIT_RECOMPUTE_LOCK_TTL_MS);
}

export async function releaseBanditRecomputeLock(handle: BanditRecomputeLockHandle): Promise<void> {
  await releaseRedisTokenLock(handle);
}
