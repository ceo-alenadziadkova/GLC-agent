import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const { runPipelineStartMock } = vi.hoisted(() => ({
  runPipelineStartMock: vi.fn(),
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

vi.mock('../services/pipeline-routes/pipeline-route.service.js', () => ({
  runPipelineStart: runPipelineStartMock,
  schedulePipelineExecution: vi.fn(),
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

describe('pipeline/start route forwards readiness blocked payload', () => {
  it('returns 422 with blocked readiness code and statuses', async () => {
    runPipelineStartMock.mockResolvedValueOnce({
      ok: false,
      error: {
        status: 422,
        body: {
          ok: false,
          code: 'INTAKE_READINESS_BLOCKED',
          detail: {
            flowReadinessStatus: 'flow_ready',
            auditReadinessStatus: 'blocked',
            trace: [{ code: 'CRITICAL_SIGNALS_MISSING' }],
          },
        },
      },
    });

    const res = await fetch(`${baseUrl}/api/audits/audit-001/pipeline/start`, { method: 'POST' });
    expect(res.status).toBe(422);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('INTAKE_READINESS_BLOCKED');
    const detail = body.detail as Record<string, unknown>;
    expect(detail.flowReadinessStatus).toBe('flow_ready');
    expect(detail.auditReadinessStatus).toBe('blocked');
  });
});

