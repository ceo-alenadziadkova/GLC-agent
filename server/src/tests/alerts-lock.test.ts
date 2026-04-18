import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { redisSetMock, redisGetMock, redisDelMock, supabaseFromMock } = vi.hoisted(() => ({
  redisSetMock: vi.fn(),
  redisGetMock: vi.fn(),
  redisDelMock: vi.fn(),
  supabaseFromMock: vi.fn(() => ({
    select: vi.fn(() => ({
      gte: vi.fn(async () => ({ data: [], error: null })),
    })),
  })),
}));

vi.mock('../services/redis.js', () => ({
  getSharedRedisClient: () => ({
    set: redisSetMock,
    get: redisGetMock,
    del: redisDelMock,
  }),
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

vi.mock('../services/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../lib/idempotency.js', () => ({
  cleanupExpiredIdempotencyKeys: vi.fn(async () => 0),
}));

import { startAlertsWorker } from '../services/alerts.js';

describe('alerts worker distributed lock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'token';
    process.env.TELEGRAM_CHAT_ID = 'chat';
    redisSetMock.mockResolvedValue(null); // lock already held by another instance
    redisGetMock.mockResolvedValue(null);
    redisDelMock.mockResolvedValue(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('skips runAlertChecks when distributed lock is not acquired', async () => {
    startAlertsWorker();
    await vi.advanceTimersByTimeAsync(61_000);
    expect(redisSetMock).toHaveBeenCalled();
    expect(supabaseFromMock).not.toHaveBeenCalled();
  });
});

