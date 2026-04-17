import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const { enqueueMock, startPhaseMock } = vi.hoisted(() => ({
  enqueueMock: vi.fn(async () => true),
  startPhaseMock: vi.fn(async () => undefined),
}));

vi.mock('../services/pipeline-jobs.js', () => ({
  enqueuePipelineJob: enqueueMock,
}));

vi.mock('../services/pipeline.js', () => ({
  PipelineOrchestrator: class {
    startPhase() {
      return startPhaseMock();
    }
    runBlock() {
      return Promise.resolve();
    }
  },
}));

vi.mock('../services/pipeline-error.js', () => ({
  emitPhaseErrorDurable: vi.fn(async () => undefined),
}));

vi.mock('../services/notifications.js', () => ({
  notifyAuditParticipants: vi.fn(async () => undefined),
  notifyAuditParticipantsExcept: vi.fn(async () => undefined),
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userId = 'user-001';
    next();
  },
  attachProfile: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userRole = 'consultant';
    next();
  },
  rejectGuestFromPortal: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/rate-limit.js', () => ({
  pipelineLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../services/brief-validator.js', () => ({
  evaluateBriefGates: () => ({ intakeProgress: { ready: true, missing: [] } }),
  resolveIntakeSurfaceForPlan: () => 'client',
  validationPerspectiveForBriefAccess: () => 'consultant',
}));

vi.mock('@glc/intake-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@glc/intake-core')>();
  return {
    ...actual,
    currentIntakeVersionTuple: () => ({ policyVersion: 'v1', questionBankVersion: 'v1' }),
    isSupportedIntakeArtifactTuple: () => true,
    REVIEW_GATE_NOTES_MAX: 5000,
  };
});

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'audits') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            or: vi.fn().mockReturnThis(),
            single: vi.fn(async () => ({
              data: {
                id: 'audit-001',
                user_id: 'user-001',
                client_id: null,
                status: 'created',
                current_phase: 0,
                tokens_used: 0,
                token_budget: 1000,
                updated_at: '2026-01-01T00:00:00.000Z',
                product_mode: 'full',
              },
              error: null,
            })),
          })),
          update: vi.fn(() => {
            const chain: Record<string, unknown> = {};
            chain.eq = vi.fn(() => chain);
            chain.or = vi.fn(() => chain);
            chain.select = vi.fn(async () => ({ data: [{ id: 'audit-001' }], error: null }));
            return chain;
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
      return {
        insert: vi.fn(async () => ({ error: null })),
      };
    }),
  },
}));

import { pipelineRouter } from '../routes/pipeline.js';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/audits', pipelineRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => {
  server?.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('pipeline start route queue smoke', () => {
  it('uses queue path when enqueue succeeds', async () => {
    enqueueMock.mockResolvedValueOnce(true);
    const res = await fetch(`${baseUrl}/api/audits/audit-001/pipeline/start`, { method: 'POST' });
    expect(res.status).toBe(200);
    expect(enqueueMock).toHaveBeenCalledOnce();
    expect(startPhaseMock).not.toHaveBeenCalled();
  });

  it('falls back to orchestrator when enqueue fails', async () => {
    enqueueMock.mockResolvedValueOnce(false);
    const res = await fetch(`${baseUrl}/api/audits/audit-001/pipeline/start`, { method: 'POST' });
    expect(res.status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(enqueueMock).toHaveBeenCalledOnce();
    expect(startPhaseMock).toHaveBeenCalledOnce();
  });
});

