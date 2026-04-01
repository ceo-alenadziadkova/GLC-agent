/**
 * Integration tests: GET /api/audits/:id/pipeline/status
 *
 * Contract + access:
 *   - 200: shape includes audit fields, events[], reviews[]
 *   - Owner and client_id can read the same audit
 *   - Unrelated user gets 404
 *   - .or() filter includes both user_id and client_id for RLS-aligned access
 *
 * Supabase is mocked; Express app on random port; native fetch.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const {
  OWNER,
  CLIENT,
  STRANGER,
  AUDIT_ID,
  setRequestUserId,
  setAuditRow,
  setEvents,
  setReviews,
  getLastOrFilter,
} = vi.hoisted(() => {
  const OWNER = 'user-owner';
  const CLIENT = 'user-client';
  const STRANGER = 'user-stranger';
  const AUDIT_ID = 'audit-status-001';

  let requestUserId = OWNER;
  type AuditShape = {
    id: string;
    user_id: string;
    client_id: string | null;
    status: string;
    current_phase: number;
    tokens_used: number;
    token_budget: number;
    product_mode: string;
  };
  let auditRow: AuditShape | null = {
    id: AUDIT_ID,
    user_id: OWNER,
    client_id: CLIENT,
    status: 'review',
    current_phase: 0,
    tokens_used: 1000,
    token_budget: 200_000,
    product_mode: 'full',
  };
  let events: Array<Record<string, unknown>> = [];
  let reviews: Array<Record<string, unknown>> = [];
  let lastOrFilter: string | null = null;

  const getRequestUserId = () => requestUserId;
  const setRequestUserId = (id: string) => {
    requestUserId = id;
  };
  const setAuditRow = (row: AuditShape | null) => {
    auditRow = row;
  };
  const setEvents = (e: Array<Record<string, unknown>>) => {
    events = e;
  };
  const setReviews = (r: Array<Record<string, unknown>>) => {
    reviews = r;
  };
  const getLastOrFilter = () => lastOrFilter;

  (globalThis as Record<string, unknown>).__statusRouteGetUserId = getRequestUserId;

  const makeAuditsChain = () => {
    let idFilter: string | undefined;
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn((col: string, val: string) => {
      if (col === 'id') idFilter = val;
      return chain;
    });
    chain.or = vi.fn((filter: string) => {
      lastOrFilter = filter;
      return chain;
    });
    chain.single = vi.fn(async () => {
      if (!auditRow || idFilter !== auditRow.id) {
        return { data: null, error: { code: 'PGRST116' } };
      }
      const uid = getRequestUserId();
      if (auditRow.user_id !== uid && auditRow.client_id !== uid) {
        return { data: null, error: { code: 'PGRST116' } };
      }
      return {
        data: {
          status: auditRow.status,
          current_phase: auditRow.current_phase,
          tokens_used: auditRow.tokens_used,
          token_budget: auditRow.token_budget,
          product_mode: auditRow.product_mode,
        },
        error: null,
      };
    });
    return chain;
  };

  const mockFrom = vi.fn((table: string) => {
    if (table === 'audits') return makeAuditsChain();
    if (table === 'pipeline_events') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: events, error: null })),
            })),
          })),
        })),
      };
    }
    if (table === 'review_points') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(async () => ({ data: reviews, error: null })),
          })),
        })),
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(async () => ({ data: null, error: null })),
      })),
    };
  });

  (globalThis as Record<string, unknown>).__pipelineStatusMockFrom = mockFrom;
  return {
    OWNER,
    CLIENT,
    STRANGER,
    AUDIT_ID,
    setRequestUserId,
    setAuditRow,
    setEvents,
    setReviews,
    getLastOrFilter,
  };
});

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__pipelineStatusMockFrom as typeof vi.fn },
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userId = ((globalThis as Record<string, unknown>).__statusRouteGetUserId as () => string)();
    next();
  },
  attachProfile: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/rate-limit.js', () => ({
  pipelineLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  createAuditLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  generalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../services/pipeline.js', () => ({
  PipelineOrchestrator: class {
    startPhase() { return Promise.resolve(); }
    runBlock() { return Promise.resolve(); }
  },
}));

import { pipelineRouter } from '../routes/pipeline.js';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/audits', pipelineRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>(done => server?.close(() => done()));
});

beforeEach(() => {
  vi.clearAllMocks();
  setRequestUserId(OWNER);
  setAuditRow({
    id: AUDIT_ID,
    user_id: OWNER,
    client_id: CLIENT,
    status: 'review',
    current_phase: 0,
    tokens_used: 1000,
    token_budget: 200_000,
    product_mode: 'full',
  });
  setEvents([
    { id: 1, audit_id: AUDIT_ID, event_type: 'completed', phase: 0, message: 'ok', created_at: '2026-01-01T00:00:00Z' },
  ]);
  setReviews([
    { id: 1, audit_id: AUDIT_ID, after_phase: 0, status: 'pending' },
  ]);
});

describe('GET /api/audits/:id/pipeline/status', () => {
  it('returns 200 with contract shape for audit owner', async () => {
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/pipeline/status`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    expect(body.status).toBe('review');
    expect(body.current_phase).toBe(0);
    expect(body.tokens_used).toBe(1000);
    expect(body.token_budget).toBe(200_000);
    expect(body.product_mode).toBe('full');
    expect(Array.isArray(body.events)).toBe(true);
    expect((body.events as unknown[])).toHaveLength(1);
    expect(Array.isArray(body.reviews)).toBe(true);
    expect((body.reviews as unknown[])).toHaveLength(1);

    expect(getLastOrFilter()).toBe(`user_id.eq.${OWNER},client_id.eq.${OWNER}`);
  });

  it('returns 200 for client_id when user is the linked client', async () => {
    setRequestUserId(CLIENT);
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/pipeline/status`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe('review');
    expect(getLastOrFilter()).toBe(`user_id.eq.${CLIENT},client_id.eq.${CLIENT}`);
  });

  it('returns 404 when user is neither owner nor client', async () => {
    setRequestUserId(STRANGER);
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/pipeline/status`);
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not found/i);
  });

  it('returns empty arrays when events and reviews have no rows', async () => {
    setEvents([]);
    setReviews([]);
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/pipeline/status`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.events).toEqual([]);
    expect(body.reviews).toEqual([]);
  });

  it('uses owner+client or filter string matching requesting user id', async () => {
    setRequestUserId(OWNER);
    await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/pipeline/status`);
    expect(getLastOrFilter()).toContain(OWNER);
    expect(getLastOrFilter()).toContain('user_id.eq.');
    expect(getLastOrFilter()).toContain('client_id.eq.');
  });
});
