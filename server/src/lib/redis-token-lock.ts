import { generateLockToken } from './generate-lock-token.js';

/** Subset of `redis` client API used for compare-and-delete token locks (no server imports). */
export type RedisTokenLockRedis = {
  set(key: string, value: string, options: { NX: true; PX: number }): Promise<string | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
};

export type RedisTokenLockHandle = {
  redis: RedisTokenLockRedis;
  key: string;
  token: string;
};

/**
 * Acquires an exclusive Redis lock with a random token (`generateLockToken`) and TTL.
 * Release with `releaseRedisTokenLock`; only the same token may delete the key.
 */
export async function acquireRedisTokenLock(
  redis: RedisTokenLockRedis,
  key: string,
  ttlMs: number,
): Promise<RedisTokenLockHandle | null> {
  const token = generateLockToken();
  const ok = await redis.set(key, token, { NX: true, PX: ttlMs });
  if (ok !== 'OK') return null;
  return { redis, key, token };
}

export async function releaseRedisTokenLock(handle: RedisTokenLockHandle): Promise<void> {
  const value = await handle.redis.get(handle.key);
  if (value === handle.token) {
    await handle.redis.del(handle.key);
  }
}
