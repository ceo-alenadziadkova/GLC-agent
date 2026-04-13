import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const mocks = vi.hoisted(() => {
  const canManagePlatformSettings = vi.fn(async () => true);
  const recomputeArmPerformanceFromEvaluationDatasets = vi.fn(async () => ({
    phases_updated: 2,
    arms_upserted: 5,
    dataset_rows_seen: 42,
  }));
  return {
    canManagePlatformSettings,
    recomputeArmPerformanceFromEvaluationDatasets,
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
  canManagePlatformSettings: (...args: unknown[]) => mocks.canManagePlatformSettings(...args),
}));

vi.mock('../services/bandit.js', () => ({
  banditService: {
    recomputeArmPerformanceFromEvaluationDatasets: (...args: unknown[]) =>
      mocks.recomputeArmPerformanceFromEvaluationDatasets(...args),
  },
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
  });
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
    });
    expect(mocks.recomputeArmPerformanceFromEvaluationDatasets).toHaveBeenCalledTimes(1);
  });

  it('returns 403 when caller cannot manage platform settings', async () => {
    mocks.canManagePlatformSettings.mockResolvedValue(false);
    const res = await fetch(`${baseUrl}/api/platform/bandits/recompute`, { method: 'POST' });
    expect(res.status).toBe(403);
    expect(mocks.recomputeArmPerformanceFromEvaluationDatasets).not.toHaveBeenCalled();
  });
});
