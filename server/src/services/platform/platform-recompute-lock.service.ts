import { getSharedRedisClient } from '../redis.js';
import { REDIS_KEYS } from '../../config/redis-keys.js';
import { PLATFORM_BANDIT_RECOMPUTE_LOCK_TTL_MS } from '../../config/platform-runtime-policy.js';

export class PlatformRecomputeLockUnavailableError extends Error {
  constructor() {
    super('Redis is required for bandit recompute locking');
    this.name = 'PlatformRecomputeLockUnavailableError';
  }
}

type BanditRecomputeLockHandle = {
  redis: ReturnType<typeof getSharedRedisClient>;
  lockToken: string;
};

export async function acquireBanditRecomputeLock(): Promise<BanditRecomputeLockHandle | null> {
  const redis = getSharedRedisClient();
  if (!redis) {
    throw new PlatformRecomputeLockUnavailableError();
  }
  const lockToken = `${process.pid}:${Date.now()}`;
  const lock = await redis.set(REDIS_KEYS.banditsRecomputeLock, lockToken, {
    NX: true,
    PX: PLATFORM_BANDIT_RECOMPUTE_LOCK_TTL_MS,
  });
  if (lock !== 'OK') {
    return null;
  }

  return { redis, lockToken };
}

export async function releaseBanditRecomputeLock(handle: BanditRecomputeLockHandle): Promise<void> {
  const value = await handle.redis.get(REDIS_KEYS.banditsRecomputeLock);
  if (value === handle.lockToken) {
    await handle.redis.del(REDIS_KEYS.banditsRecomputeLock);
  }
}
