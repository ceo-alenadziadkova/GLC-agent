import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const mocks = vi.hoisted(() => {
  const canManagePlatformSettings = vi.fn(async () => true);
  const recomputeArmPerformanceFromEvaluationDatasets = vi.fn(async () => ({
    phases_updated: 2,
    arms_upserted: 5,
    dataset_rows_seen: 42,
    dry_run: false,
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
    dry_run: false,
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
    expect(body.code).toBe('PROFILE_PAYLOAD_INVALID');
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
    expect(body.code).toBe('PROFILE_PAYLOAD_INVALID');
    expect(mocks.recomputeArmPerformanceFromEvaluationDatasets).not.toHaveBeenCalled();
  });

  it('returns 409 when recompute is already running', async () => {
    let resolveFirst: (() => void) | null = null;
    mocks.recomputeArmPerformanceFromEvaluationDatasets.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          resolveFirst = () =>
            resolve({
              phases_updated: 1,
              arms_upserted: 1,
              dataset_rows_seen: 1,
              dry_run: false,
            });
        }),
    );

    const first = fetch(`${baseUrl}/api/platform/bandits/recompute`, { method: 'POST' });
    await Promise.resolve();
    const second = await fetch(`${baseUrl}/api/platform/bandits/recompute`, { method: 'POST' });

    expect(second.status).toBe(409);
    const body = (await second.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_RECOMPUTE_IN_PROGRESS');

    resolveFirst?.();
    await first;
  });

  it('returns 500 with internal-server-error code when recompute throws', async () => {
    mocks.recomputeArmPerformanceFromEvaluationDatasets.mockRejectedValueOnce(new Error('boom'));
    const res = await fetch(`${baseUrl}/api/platform/bandits/recompute`, { method: 'POST' });
    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
