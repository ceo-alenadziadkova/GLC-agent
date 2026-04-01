import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const { setAuditRow, setBriefRow } = vi.hoisted(() => {
  let auditRow: Record<string, unknown> | null = {
    id: 'audit-001',
    status: 'created',
    current_phase: 0,
    tokens_used: 0,
    token_budget: 1000,
    updated_at: '2026-01-01T00:00:00.000Z',
    product_mode: 'express',
  };
  let briefRow: Record<string, unknown> | null = { responses: {} };

  (globalThis as Record<string, unknown>).__setPipelineAuditRow = (v: Record<string, unknown> | null) => { auditRow = v; };
  (globalThis as Record<string, unknown>).__setPipelineBriefRow = (v: Record<string, unknown> | null) => { briefRow = v; };

  const mockFrom = vi.fn((table: string) => {
    if (table === 'audits') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: auditRow, error: auditRow ? null : { code: 'PGRST116' } })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn(async () => ({ data: [{ id: 'audit-001' }], error: null })),
        })),
      };
    }
    if (table === 'intake_brief') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          single: vi.fn(async () => ({ data: briefRow, error: briefRow ? null : { code: 'PGRST116' } })),
        })),
      };
    }
    if (table === 'pipeline_events') {
      return { insert: vi.fn(async () => ({ error: null })) };
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
  (globalThis as Record<string, unknown>).__pipelineContractFrom = mockFrom;
  return {
    setAuditRow: (v: Record<string, unknown> | null) => ((globalThis as Record<string, unknown>).__setPipelineAuditRow as (x: Record<string, unknown> | null) => void)(v),
    setBriefRow: (v: Record<string, unknown> | null) => ((globalThis as Record<string, unknown>).__setPipelineBriefRow as (x: Record<string, unknown> | null) => void)(v),
  };
});

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__pipelineContractFrom },
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
    startPhase() { return Promise.resolve(); }
    runBlock() { return Promise.resolve(); }
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
    product_mode: 'express',
  });
  setBriefRow({ responses: { primary_goal: 'Grow', target_audience: 'SMB', revenue_model: 'Subscription / SaaS' } });
});

describe('POST /api/audits/:id/pipeline/start — payload contract', () => {
  it('returns intakeProgress in success response', async () => {
    const res = await fetch(`${baseUrl}/api/audits/audit-001/pipeline/start`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe('started');
    expect(body.phase).toBe(0);
    const intakeProgress = body.intakeProgress as Record<string, unknown>;
    expect(typeof intakeProgress.progressPct).toBe('number');
    expect(['low', 'medium', 'high']).toContain(intakeProgress.readinessBadge);
    expect(['complete_required', 'add_recommended', 'confirm_prefill', 'none']).toContain(intakeProgress.nextBestAction);
  });

  it('still returns intakeProgress when brief row is missing', async () => {
    setBriefRow(null);
    const res = await fetch(`${baseUrl}/api/audits/audit-001/pipeline/start`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.intakeProgress).toBeDefined();
  });
});

