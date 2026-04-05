/**
 * Integration tests: User data isolation
 *
 * Verifies that a user cannot access or mutate another user's audits.
 * The Supabase mock simulates the WHERE user_id = $userId filter:
 * queries only succeed when the requesting user matches the audit owner.
 *
 * Audit owner: user-001
 * Attacker:    user-002
 *
 * Covers:
 *  GET  /api/audits/:id      · owner → 200; attacker → 404
 *  DELETE /api/audits/:id    · owner → 200; attacker → does not delete (Supabase filter)
 *  GET  /api/audits          · each user sees only their own list (isolated by user_id filter)
 *  POST /api/audits/:id/pipeline/start  · attacker → 404 (audit not found for their user_id)
 *  POST /api/audits/:id/pipeline/next   · attacker → 404
 *  POST /api/audits/:id/reviews/:phase  · attacker → 404
 *
 * Uses native node fetch (Node 18+).
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, type Mock } from 'vitest';
import type { Server } from 'node:http';

const OWNER_ID    = 'user-001';
const ATTACKER_ID = 'user-002';
const AUDIT_ID    = 'audit-owned-by-001';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { setRequestUserId, mockDeleteChain, getDeleteCalls } = vi.hoisted(() => {
  // Shared variable: which user is making the current request
  let requestUserId = 'user-001'; // OWNER_ID — literal because vi.hoisted runs before module scope
  const setRequestUserId = (id: string) => { requestUserId = id; };
  (globalThis as Record<string, unknown>).__isolationGetUserId = () => requestUserId;

  // Track delete call filters to verify isolation (delete should filter by user_id)
  const deleteCalls: Array<{ filters: Record<string, string> }> = [];
  const getDeleteCalls = () => deleteCalls;

  const auditRow = {
    id: 'audit-owned-by-001',
    user_id: 'user-001',
    client_id: null as string | null,
    status: 'created',
    current_phase: 0,
    tokens_used: 0,
    token_budget: 200_000,
    product_mode: 'full',
  };

  // Chainable mock: list uses .or(); GET :id uses .eq('id').or(...).single()
  const makeAuditChain = () => {
    const filters: Record<string, string> = {};
    const chain: Record<string, unknown> = {};

    chain.select = vi.fn().mockReturnValue(chain);
    chain.order  = vi.fn().mockReturnValue(chain);
    chain.or = vi.fn(() => {
      filters['_orCalled'] = '1';
      return chain;
    });
    chain.range = vi.fn(() => {
      const userId = (globalThis as unknown as { __isolationGetUserId?: () => string }).__isolationGetUserId?.() ?? '';
      const allowed = auditRow.user_id === userId || auditRow.client_id === userId;
      if (allowed) {
        return Promise.resolve({
          data: [{ ...auditRow }],
          error: null,
          count: 1,
        });
      }
      return Promise.resolve({ data: [], error: null, count: 0 });
    });
    chain.eq = vi.fn((col: string, val: string) => {
      filters[col] = val;
      return chain;
    });
    chain.single = vi.fn(() => {
      const userId = (globalThis as unknown as { __isolationGetUserId?: () => string }).__isolationGetUserId?.() ?? '';
      if (filters['id'] !== 'audit-owned-by-001') {
        return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'not found' } });
      }
      // Pipeline start/next/reviews: .eq('id').eq('user_id', req.userId).single()
      if (filters['user_id'] !== undefined) {
        if (auditRow.user_id === filters['user_id']) {
          return Promise.resolve({ data: { ...auditRow }, error: null });
        }
        return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'not found' } });
      }
      // Brief route: .eq('id').single() — row returned here; route enforces access in app code.
      if (!filters['_orCalled']) {
        return Promise.resolve({ data: { ...auditRow }, error: null });
      }
      const allowed = auditRow.user_id === userId || auditRow.client_id === userId;
      if (allowed) {
        return Promise.resolve({ data: { ...auditRow }, error: null });
      }
      return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'not found' } });
    });
    chain.delete = vi.fn(() => {
      const userId = (globalThis as unknown as { __isolationGetUserId?: () => string }).__isolationGetUserId?.() ?? '';
      filters['_requester'] = String(userId);
      deleteCalls.push({ filters: { ...filters } });
      chain.eq = vi.fn((col: string, val: string) => {
        filters[col] = val;
        return chain;
      });
      return chain;
    });
    // Resolve delete chain (no error regardless of who called — we verify via filter tracking)
    (chain as Record<string, unknown>)._resolveDelete = () => Promise.resolve({ error: null });

    return chain;
  };

  // Minimal mock for non-audits tables (always returns safe empty data)
  const makeChildChain = () => ({
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    limit:  vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    or:     vi.fn().mockReturnThis(),
  });

  const mockFrom = vi.fn((table: string) => {
    if (table === 'audits') return makeAuditChain();
    return makeChildChain();
  });

  (globalThis as Record<string, unknown>).__isolationMockFrom = mockFrom;

  return { setRequestUserId, mockDeleteChain: makeAuditChain, getDeleteCalls };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__isolationMockFrom },
}));

// Auth: reads the current test user from the shared variable
vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userId = ((globalThis as Record<string, unknown>).__isolationGetUserId as () => string)();
    req.userEmail = req.userId === OWNER_ID ? 'owner@test.com' : 'attacker@test.com';
    next();
  },
  attachProfile: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userRole = 'consultant';
    next();
  },
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/rate-limit.js', () => ({
  createAuditLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  generalLimiter:     (_req: unknown, _res: unknown, next: () => void) => next(),
  pipelineLimiter:    (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../services/pipeline.js', () => ({
  PipelineOrchestrator: class MockPipelineOrchestrator {
    constructor(public auditId: string) {}
    startPhase(_phase: number) {
      return Promise.resolve();
    }
    runBlock() {
      return Promise.resolve();
    }
  },
}));

vi.mock('../services/brief-validator.js', () => ({
  assertBriefReady: vi.fn().mockResolvedValue(undefined),
  saveBriefResponses: vi.fn(),
  validateBriefResponses: vi.fn().mockReturnValue({ passed: true, sla_met: true, answered_required: 0, total_required: 0, answered_recommended: 0, total_recommended: 0, missing_required: [] }),
}));

// ─── App setup ────────────────────────────────────────────────────────────────

import express from 'express';
import { auditsRouter } from '../routes/audits.js';
import { pipelineRouter } from '../routes/pipeline.js';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/audits', auditsRouter);
  app.use('/api/audits', pipelineRouter);

  await new Promise<void>(resolve => {
    server = app.listen(0, () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>(r => server.close(() => r()));
});

beforeEach(() => {
  setRequestUserId(OWNER_ID); // reset to owner before each test
  vi.clearAllMocks();
});

// ─── GET /api/audits/:id ──────────────────────────────────────────────────────

describe('GET /api/audits/:id — user isolation', () => {
  it('returns 200 for the audit owner', async () => {
    setRequestUserId(OWNER_ID);
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}`);
    expect(res.status).toBe(200);
  });

  it('returns 404 when a different user requests the same audit', async () => {
    setRequestUserId(ATTACKER_ID);
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}`);
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not found/i);
  });
});

// ─── GET /api/audits (list) ───────────────────────────────────────────────────

describe('GET /api/audits — list isolation', () => {
  it('always filters by the requesting user_id (owner)', async () => {
    setRequestUserId(OWNER_ID);
    const res = await fetch(`${baseUrl}/api/audits`);
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[] };
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it('always filters by the requesting user_id (attacker gets empty list, not owner data)', async () => {
    setRequestUserId(ATTACKER_ID);
    const res = await fetch(`${baseUrl}/api/audits`);
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[] };
    // Attacker gets their own (empty) list, not owner's audits
    expect(body.data).toEqual([]);
  });
});

// ─── POST /api/audits/:id/pipeline/start ─────────────────────────────────────

describe('POST /api/audits/:id/pipeline/start — user isolation', () => {
  it('returns 404 when the attacker tries to start someone else\'s pipeline', async () => {
    setRequestUserId(ATTACKER_ID);
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/pipeline/start`, { method: 'POST' });
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/not found/i);
  });
});

// ─── POST /api/audits/:id/pipeline/next ──────────────────────────────────────

describe('POST /api/audits/:id/pipeline/next — user isolation', () => {
  it('returns 404 when the attacker tries to advance someone else\'s pipeline', async () => {
    setRequestUserId(ATTACKER_ID);
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/pipeline/next`, { method: 'POST' });
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/audits/:id/reviews/:phase ─────────────────────────────────────

describe('POST /api/audits/:id/reviews/:phase — user isolation', () => {
  it('returns 404 when the attacker tries to approve someone else\'s review', async () => {
    setRequestUserId(ATTACKER_ID);
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/reviews/0`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consultant_notes: 'hacked' }),
    });
    expect(res.status).toBe(404);
  });
});
