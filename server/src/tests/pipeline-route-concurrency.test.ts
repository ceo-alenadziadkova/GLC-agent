import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const {
  setAuditRow,
  setClaimStartSuccess,
  setClaimNextSuccess,
  setClaimRetrySuccess,
  getStartPhaseCalls,
  getRunBlockCalls,
} = vi.hoisted(() => {
  let auditRow: Record<string, unknown> | null = {
    id: 'audit-001',
    status: 'created',
    current_phase: 0,
    tokens_used: 0,
    token_budget: 1000,
    updated_at: '2026-01-01T00:00:00.000Z',
    product_mode: 'full',
  };
  let claimStartSuccess = true;
  let claimNextSuccess = true;
  let claimRetrySuccess = true;

  let startPhaseCalls = 0;
  let runBlockCalls = 0;

  const setAuditRow = (v: Record<string, unknown> | null) => {
    auditRow = v;
  };
  const setClaimStartSuccess = (v: boolean) => {
    claimStartSuccess = v;
  };
  const setClaimNextSuccess = (v: boolean) => {
    claimNextSuccess = v;
  };
  const setClaimRetrySuccess = (v: boolean) => {
    claimRetrySuccess = v;
  };
  const getStartPhaseCalls = () => startPhaseCalls;
  const getRunBlockCalls = () => runBlockCalls;

  const mockFrom = vi.fn((table: string) => {
    if (table === 'audits') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: auditRow, error: auditRow ? null : { code: 'PGRST116' } })),
        })),
        update: vi.fn((payload: Record<string, unknown>) => {
          const isStartClaim = payload.status === 'recon' && payload.current_phase === 0;
          const isRetryOrNextClaim = typeof payload.status === 'string' && payload.current_phase === undefined;
          return {
            eq: vi.fn().mockReturnThis(),
            select: vi.fn(async () => {
              if (isStartClaim) {
                return { data: claimStartSuccess ? [{ id: 'audit-001' }] : [], error: null };
              }
              if (isRetryOrNextClaim) {
                const isRetryCall = auditRow?.status === 'failed';
                if (isRetryCall) {
                  return { data: claimRetrySuccess ? [{ id: 'audit-001' }] : [], error: null };
                }
                return { data: claimNextSuccess ? [{ id: 'audit-001' }] : [], error: null };
              }
              return { data: [{ id: 'audit-001' }], error: null };
            }),
          };
        }),
      };
    }
    if (table === 'intake_brief') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: { responses: {} }, error: null })),
        })),
      };
    }
    if (table === 'review_points') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: null, error: { code: 'PGRST116' } })),
        })),
      };
    }
    if (table === 'pipeline_events') {
      return {
        insert: vi.fn(async () => ({ error: null })),
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: null, error: null })),
      })),
      insert: vi.fn(async () => ({ error: null })),
      update: vi.fn(() => ({ eq: vi.fn().mockReturnThis() })),
    };
  });

  (globalThis as Record<string, unknown>).__pipelineRouteConcurrencyFrom = mockFrom;
  (globalThis as Record<string, unknown>).__pipelineStartPhaseSpy = () => {
    startPhaseCalls += 1;
    return Promise.resolve();
  };
  (globalThis as Record<string, unknown>).__pipelineRunBlockSpy = () => {
    runBlockCalls += 1;
    return Promise.resolve();
  };

  return {
    setAuditRow,
    setClaimStartSuccess,
    setClaimNextSuccess,
    setClaimRetrySuccess,
    getStartPhaseCalls,
    getRunBlockCalls,
  };
});

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__pipelineRouteConcurrencyFrom },
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userId = 'user-001';
    next();
  },
  attachProfile: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/rate-limit.js', () => ({
  pipelineLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../services/pipeline.js', () => ({
  PipelineOrchestrator: class {
    startPhase() {
      return ((globalThis as Record<string, unknown>).__pipelineStartPhaseSpy as () => Promise<void>)();
    }
    runBlock() {
      return ((globalThis as Record<string, unknown>).__pipelineRunBlockSpy as () => Promise<void>)();
    }
  },
}));

import { pipelineRouter } from '../routes/pipeline.js';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/audits', pipelineRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  vi.clearAllMocks();
  setAuditRow({
    id: 'audit-001',
    status: 'created',
    current_phase: 0,
    tokens_used: 0,
    token_budget: 1000,
    updated_at: '2026-01-01T00:00:00.000Z',
    product_mode: 'full',
  });
  setClaimStartSuccess(true);
  setClaimNextSuccess(true);
  setClaimRetrySuccess(true);
});

describe('pipeline route concurrency guards', () => {
  it('POST /pipeline/start returns 409 when claim is already taken', async () => {
    setClaimStartSuccess(false);
    const res = await fetch(`${baseUrl}/api/audits/audit-001/pipeline/start`, { method: 'POST' });
    expect(res.status).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/already claimed/i);
    expect(getStartPhaseCalls()).toBe(0);
  });

  it('POST /pipeline/next returns 409 when audit is already in active phase status', async () => {
    setAuditRow({
      id: 'audit-001',
      status: 'recon',
      current_phase: 0,
      tokens_used: 0,
      token_budget: 1000,
      updated_at: '2026-01-01T00:00:00.000Z',
      product_mode: 'full',
    });
    const res = await fetch(`${baseUrl}/api/audits/audit-001/pipeline/next`, { method: 'POST' });
    expect(res.status).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/already in progress/i);
    expect(getRunBlockCalls()).toBe(0);
  });

  it('POST /pipeline/next returns 409 when optimistic claim fails', async () => {
    setAuditRow({
      id: 'audit-001',
      status: 'review',
      current_phase: 0,
      tokens_used: 0,
      token_budget: 1000,
      updated_at: '2026-01-01T00:00:00.000Z',
      product_mode: 'full',
    });
    setClaimNextSuccess(false);
    const res = await fetch(`${baseUrl}/api/audits/audit-001/pipeline/next`, { method: 'POST' });
    expect(res.status).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/already claimed/i);
    expect(getRunBlockCalls()).toBe(0);
  });

  it('POST /pipeline/retry returns 409 when phase is actively executing', async () => {
    setAuditRow({
      id: 'audit-001',
      status: 'auto',
      current_phase: 2,
      tokens_used: 0,
      token_budget: 1000,
      updated_at: '2026-01-01T00:00:00.000Z',
      product_mode: 'full',
    });
    const res = await fetch(`${baseUrl}/api/audits/audit-001/pipeline/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 2 }),
    });
    expect(res.status).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/already in progress/i);
  });

  it('POST /pipeline/retry returns 409 when retry claim is taken', async () => {
    setAuditRow({
      id: 'audit-001',
      status: 'failed',
      current_phase: 2,
      tokens_used: 0,
      token_budget: 1000,
      updated_at: '2026-01-01T00:00:00.000Z',
      product_mode: 'full',
    });
    setClaimRetrySuccess(false);
    const res = await fetch(`${baseUrl}/api/audits/audit-001/pipeline/retry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: 2 }),
    });
    expect(res.status).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/already claimed/i);
  });
});
