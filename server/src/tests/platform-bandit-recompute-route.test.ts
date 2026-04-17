import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const mocks = vi.hoisted(() => {
  const canManagePlatformSettings = vi.fn(async (_userId: string) => true);
  const recomputeArmPerformanceFromEvaluationDatasets = vi.fn(
    async (_phaseId?: string, _opts?: { dryRun?: boolean }) => ({
      phases_updated: 2,
      arms_upserted: 5,
      dataset_rows_seen: 42,
      dry_run: false,
    }),
  );
  return {
    canManagePlatformSettings,
    recomputeArmPerformanceFromEvaluationDatasets,
    redisSet: vi.fn(async (): Promise<string | null> => 'OK'),
    redisGet: vi.fn(async () => null),
    redisDel: vi.fn(async () => 1),
    redisAvailable: true,
  };
});

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userId = 'user-001';
    next();
  },
  attachProfile: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/rate-limit.js', () => ({
  generalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../services/supabase.js', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../lib/platform-admin.js', () => ({
  canManagePlatformSettings: mocks.canManagePlatformSettings,
}));

vi.mock('../services/bandit.js', () => ({
  banditService: {
    recomputeArmPerformanceFromEvaluationDatasets: mocks.recomputeArmPerformanceFromEvaluationDatasets,
  },
}));

vi.mock('../services/redis.js', () => ({
  getSharedRedisClient: () =>
    mocks.redisAvailable
      ? ({
          set: mocks.redisSet,
          get: mocks.redisGet,
          del: mocks.redisDel,
        } as const)
      : null,
}));

import { platformRouter } from '../routes/platform.js';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/platform', platformRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.canManagePlatformSettings.mockResolvedValue(true);
  mocks.recomputeArmPerformanceFromEvaluationDatasets.mockResolvedValue({
    phases_updated: 2,
    arms_upserted: 5,
    dataset_rows_seen: 42,
    dry_run: false,
  });
  mocks.redisSet.mockResolvedValue('OK');
  mocks.redisGet.mockResolvedValue(null);
  mocks.redisDel.mockResolvedValue(1);
  mocks.redisAvailable = true;
});

describe('POST /api/platform/bandits/recompute', () => {
  it('returns recompute summary for platform admin', async () => {
    const res = await fetch(`${baseUrl}/api/platform/bandits/recompute`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toEqual({
      ok: true,
      phases_updated: 2,
      arms_upserted: 5,
      dataset_rows_seen: 42,
      dry_run: false,
    });
    expect(mocks.recomputeArmPerformanceFromEvaluationDatasets).toHaveBeenCalledTimes(1);
    expect(mocks.recomputeArmPerformanceFromEvaluationDatasets).toHaveBeenCalledWith(undefined, {
      dryRun: false,
    });
  });

  it('returns 403 when caller cannot manage platform settings', async () => {
    mocks.canManagePlatformSettings.mockResolvedValue(false);
    const res = await fetch(`${baseUrl}/api/platform/bandits/recompute`, { method: 'POST' });
    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_ADMIN_ONLY');
    expect(mocks.recomputeArmPerformanceFromEvaluationDatasets).not.toHaveBeenCalled();
  });

  it('passes phase_id and dry_run to service', async () => {
    const res = await fetch(`${baseUrl}/api/platform/bandits/recompute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phase_id: 'security_compliance', dry_run: true }),
    });
    expect(res.status).toBe(200);
    expect(mocks.recomputeArmPerformanceFromEvaluationDatasets).toHaveBeenCalledWith(
      'security_compliance',
      { dryRun: true },
    );
  });

  it('returns 400 for invalid phase_id payload', async () => {
    const res = await fetch(`${baseUrl}/api/platform/bandits/recompute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ phase_id: 'invalid_phase' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_PAYLOAD_INVALID');
    expect(mocks.recomputeArmPerformanceFromEvaluationDatasets).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid dry_run payload', async () => {
    const res = await fetch(`${baseUrl}/api/platform/bandits/recompute`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ dry_run: 'yes' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_PAYLOAD_INVALID');
    expect(mocks.recomputeArmPerformanceFromEvaluationDatasets).not.toHaveBeenCalled();
  });

  it('returns 409 when recompute is already running', async () => {
    type RecomputeSummary = {
      phases_updated: number;
      arms_upserted: number;
      dataset_rows_seen: number;
      dry_run: boolean;
    };
    const deferred: { resolve: ((value: RecomputeSummary) => void) | null } = { resolve: null };
    mocks.recomputeArmPerformanceFromEvaluationDatasets.mockImplementationOnce(
      () =>
        new Promise<RecomputeSummary>(resolve => {
          deferred.resolve = resolve;
        }),
    );

    mocks.redisSet.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);
    const first = fetch(`${baseUrl}/api/platform/bandits/recompute`, { method: 'POST' });
    await Promise.resolve();
    const second = await fetch(`${baseUrl}/api/platform/bandits/recompute`, { method: 'POST' });

    expect(second.status).toBe(409);
    const body = (await second.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_RECOMPUTE_IN_PROGRESS');

    deferred.resolve?.({
      phases_updated: 1,
      arms_upserted: 1,
      dataset_rows_seen: 1,
      dry_run: false,
    });
    await first;
  });

  it('returns 409 when distributed lock is already held', async () => {
    mocks.redisSet.mockResolvedValueOnce(null);
    const res = await fetch(`${baseUrl}/api/platform/bandits/recompute`, { method: 'POST' });
    expect(res.status).toBe(409);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_RECOMPUTE_IN_PROGRESS');
    expect(mocks.recomputeArmPerformanceFromEvaluationDatasets).not.toHaveBeenCalled();
  });

  it('returns 500 with internal-server-error code when recompute throws', async () => {
    mocks.recomputeArmPerformanceFromEvaluationDatasets.mockRejectedValueOnce(new Error('boom'));
    const res = await fetch(`${baseUrl}/api/platform/bandits/recompute`, { method: 'POST' });
    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('returns 503 with lock-unavailable code when redis lock backend is not configured', async () => {
    mocks.redisAvailable = false;
    const res = await fetch(`${baseUrl}/api/platform/bandits/recompute`, { method: 'POST' });
    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_RECOMPUTE_LOCK_UNAVAILABLE');
    expect(mocks.recomputeArmPerformanceFromEvaluationDatasets).not.toHaveBeenCalled();
  });
});
