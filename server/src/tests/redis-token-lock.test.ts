import { describe, expect, it, vi } from 'vitest';
import { acquireRedisTokenLock, releaseRedisTokenLock, type RedisTokenLockRedis } from '../lib/redis-token-lock.js';

function mockRedis(initial: Record<string, string>): RedisTokenLockRedis & { stored: Record<string, string> } {
  const stored = { ...initial };
  return {
    stored,
    async set(key, value, options) {
      if (!options.NX || options.PX <= 0) return null;
      if (key in stored) return null;
      stored[key] = value;
      return 'OK';
    },
    async get(key) {
      return stored[key] ?? null;
    },
    async del(key) {
      if (!(key in stored)) return 0;
      delete stored[key];
      return 1;
    },
  };
}

describe('redis-token-lock', () => {
  it('acquire returns null when key already held', async () => {
    const redis = mockRedis({ k: 'other' });
    const got = await acquireRedisTokenLock(redis, 'k', 1000);
    expect(got).toBeNull();
  });

  it('release deletes only when token matches', async () => {
    const redis = mockRedis({});
    const a = await acquireRedisTokenLock(redis, 'job', 5000);
    expect(a).not.toBeNull();
    expect(redis.stored.job).toBe(a!.token);
    await releaseRedisTokenLock({
      redis,
      key: 'job',
      token: 'wrong-token',
    });
    expect(redis.stored.job).toBe(a!.token);
    await releaseRedisTokenLock(a!);
    expect('job' in redis.stored).toBe(false);
  });

  it('acquire succeeds after release', async () => {
    const redis = mockRedis({});
    const first = await acquireRedisTokenLock(redis, 'x', 5000);
    expect(first).not.toBeNull();
    await releaseRedisTokenLock(first!);
    const second = await acquireRedisTokenLock(redis, 'x', 5000);
    expect(second).not.toBeNull();
    expect(second!.token).not.toBe(first!.token);
  });

  it('passes PX to set (observable via spy)', async () => {
    const redis = mockRedis({});
    const spy = vi.spyOn(redis, 'set');
    await acquireRedisTokenLock(redis, 'k', 12_000);
    expect(spy).toHaveBeenCalledWith(
      'k',
      expect.stringMatching(/^glc:/),
      { NX: true, PX: 12_000 },
    );
  });
});
