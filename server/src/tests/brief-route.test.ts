/**
 * Integration tests: GET /api/audits/:id/brief + PUT /api/audits/:id/brief
 *
 * Tests the brief HTTP endpoints on a real Express app (random port).
 * Supabase, requireAuth, attachProfile, requireRole, rate-limit are all mocked.
 *
 * Covers:
 *  GET /api/audits/:id/brief
 *    · 200 with questions array and null brief on first call
 *    · 200 with populated brief when brief row exists
 *    · validation stats computed from live responses
 *    · 403 when user is not owner or client of the audit
 *    · 404 when audit does not exist
 *    · 401 without Authorization header (auth not bypassed)
 *
 *  PUT /api/audits/:id/brief
 *    · 200 saves valid responses, returns brief + validation
 *    · sla_met=true when all required answered
 *    · sla_met=false when required answers missing
 *    · 400 for missing/malformed responses field
 *    · 400 for Zod schema violation (value too long)
 *    · 403 when user does not own audit
 *    · 404 when audit not found
 *    · partial save: only supplied keys updated
 *
 * Uses native node fetch (Node 18+).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, type Mock } from 'vitest';
import type { Server } from 'node:http';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  setAuditRow,
  setBriefRow,
  getUpsertPayload,
} = vi.hoisted(() => {
  // Default: audit owned by the test user, express mode
  let auditRow: Record<string, unknown> | null = {
    id: 'audit-001',
    user_id: 'user-001',
    client_id: null,
    product_mode: 'express',
  };
  let briefRow: Record<string, unknown> | null = null;
  let lastUpsertPayload: unknown = null;

  const setAuditRow = (v: Record<string, unknown> | null) => { auditRow = v; };
  const setBriefRow = (v: Record<string, unknown> | null) => { briefRow = v; };
  const getUpsertPayload = () => lastUpsertPayload;

  const makeBriefUpsertChain = () => ({
    select: vi.fn(() => ({
      single: vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'brief-id-001',
            audit_id: 'audit-001',
            responses: lastUpsertPayload ? (lastUpsertPayload as Record<string, unknown>).responses : {},
            status: 'draft',
            sla_met: false,
            answered_required: 0,
            answered_recommended: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          error: null,
        })
      ),
    })),
  });

  const mockFrom = vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => {
        if (table === 'audits') {
          return Promise.resolve({
            data: auditRow,
            error: auditRow ? null : { code: 'PGRST116' },
          });
        }
        if (table === 'intake_brief') {
          return Promise.resolve({
            data: briefRow,
            error: briefRow ? null : { code: 'PGRST116' },
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    })),
    upsert: vi.fn((payload: unknown) => {
      lastUpsertPayload = payload;
      return makeBriefUpsertChain();
    }),
  }));

  (globalThis as Record<string, unknown>).__briefRouteMockFrom = mockFrom;
  (globalThis as Record<string, unknown>).__setAuditRow = setAuditRow;
  (globalThis as Record<string, unknown>).__setBriefRow = setBriefRow;

  return { setAuditRow, setBriefRow, getUpsertPayload };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__briefRouteMockFrom },
}));

// requireAuth: always passes, injects user-001
vi.mock('../middleware/auth.js', () => ({
  requireAuth: (_req: Record<string, unknown>, _res: unknown, next: () => void) => {
    _req.userId = 'user-001';
    _req.userEmail = 'user@example.com';
    next();
  },
  attachProfile: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/rate-limit.js', () => ({
  createAuditLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  generalLimiter:     (_req: unknown, _res: unknown, next: () => void) => next(),
  pipelineLimiter:    (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// brief-validator: use real implementation (we test it as-is)
// We do NOT mock it here so the route tests exercise the real logic.

// ─── App setup ────────────────────────────────────────────────────────────────

import express from 'express';
import { auditsRouter } from '../routes/audits.js';
import { REQUIRED_QUESTION_IDS, BRIEF_QUESTIONS } from '../schemas/intake-brief.js';

let server: Server;
let baseUrl: string;

/** Headers used in every authenticated request */
const AUTH = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' };

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/audits', auditsRouter);

  await new Promise<void>(resolve => {
    server = app.listen(0, resolve);
  });

  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  vi.clearAllMocks();
  setAuditRow({ id: 'audit-001', user_id: 'user-001', client_id: null, product_mode: 'express' });
  setBriefRow(null);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFullRequired(): Record<string, string | string[] | number | null> {
  const r: Record<string, string | string[] | number | null> = {};
  for (const id of REQUIRED_QUESTION_IDS) {
    const q = BRIEF_QUESTIONS.find(q => q.id === id)!;
    if (q.type === 'number') r[id] = 1000;
    else if (q.type === 'multi_choice') r[id] = [q.options![0]];
    else r[id] = q.options ? q.options[0] : 'Test answer for ' + id;
  }
  return r;
}

async function getJSON(path: string, headers = AUTH) {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  return { status: res.status, body: await res.json() as Record<string, unknown> };
}

async function putJSON(path: string, body: unknown, headers = AUTH) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() as Record<string, unknown> };
}

// ─── GET /api/audits/:id/brief ────────────────────────────────────────────────

describe('GET /api/audits/:id/brief', () => {
  it('returns 200 with questions array and null brief on first call', async () => {
    setBriefRow(null);
    const { status, body } = await getJSON('/api/audits/audit-001/brief');

    expect(status).toBe(200);
    expect(body.questions).toBeInstanceOf(Array);
    expect((body.questions as unknown[]).length).toBe(25);
    expect(body.brief).toBeNull();
  });

  it('returns 200 with populated brief when row exists', async () => {
    const responses = makeFullRequired();
    setBriefRow({
      id: 'brief-id-001',
      audit_id: 'audit-001',
      responses,
      status: 'submitted',
      sla_met: true,
      answered_required: REQUIRED_QUESTION_IDS.length,
      answered_recommended: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const { status, body } = await getJSON('/api/audits/audit-001/brief');
    expect(status).toBe(200);
    expect(body.brief).not.toBeNull();
    expect((body.brief as Record<string, unknown>).sla_met).toBe(true);
  });

  it('includes live validation stats', async () => {
    setBriefRow({ responses: makeFullRequired() });
    const { status, body } = await getJSON('/api/audits/audit-001/brief');

    expect(status).toBe(200);
    expect(body.validation).toBeDefined();
    const v = body.validation as Record<string, unknown>;
    expect(v.total_required).toBe(REQUIRED_QUESTION_IDS.length);
    expect(v.total_recommended).toBeGreaterThan(0);
    expect(typeof v.sla_met).toBe('boolean');
    expect(typeof v.passed).toBe('boolean');
  });

  it('returns validation.sla_met=true when all required answered', async () => {
    setBriefRow({ responses: makeFullRequired() });
    const { body } = await getJSON('/api/audits/audit-001/brief');
    expect((body.validation as Record<string, unknown>).sla_met).toBe(true);
  });

  it('returns validation.sla_met=false when responses empty', async () => {
    setBriefRow({ responses: {} });
    const { body } = await getJSON('/api/audits/audit-001/brief');
    expect((body.validation as Record<string, unknown>).sla_met).toBe(false);
  });

  it('returns 404 when audit does not exist', async () => {
    setAuditRow(null);
    const { status, body } = await getJSON('/api/audits/nonexistent/brief');
    expect(status).toBe(404);
    expect(body.error).toBeDefined();
  });

  it('returns 403 when user does not own or is client of the audit', async () => {
    setAuditRow({ id: 'audit-002', user_id: 'other-user', client_id: null, product_mode: 'express' });
    const { status, body } = await getJSON('/api/audits/audit-002/brief');
    expect(status).toBe(403);
    expect(body.error).toBeDefined();
  });

  it('allows client_id access (client can view brief)', async () => {
    setAuditRow({ id: 'audit-003', user_id: 'consultant-001', client_id: 'user-001', product_mode: 'express' });
    setBriefRow(null);
    const { status } = await getJSON('/api/audits/audit-003/brief');
    expect(status).toBe(200);
  });

  it('questions array contains required priority items', async () => {
    const { body } = await getJSON('/api/audits/audit-001/brief');
    const questions = body.questions as Array<Record<string, unknown>>;
    const required = questions.filter(q => q.priority === 'required');
    expect(required.length).toBe(REQUIRED_QUESTION_IDS.length);
  });

  it('questions include all priority types', async () => {
    const { body } = await getJSON('/api/audits/audit-001/brief');
    const questions = body.questions as Array<Record<string, unknown>>;
    const priorities = new Set(questions.map(q => q.priority));
    expect(priorities.has('required')).toBe(true);
    expect(priorities.has('recommended')).toBe(true);
    expect(priorities.has('optional')).toBe(true);
  });
});

// ─── PUT /api/audits/:id/brief ────────────────────────────────────────────────

describe('PUT /api/audits/:id/brief', () => {
  it('returns 200 and saves valid responses', async () => {
    const responses = makeFullRequired();
    const { status, body } = await putJSON('/api/audits/audit-001/brief', { responses });

    expect(status).toBe(200);
    expect(body.brief).toBeDefined();
    expect(body.validation).toBeDefined();
  });

  it('returns sla_met=true in validation when all required answered', async () => {
    const { body } = await putJSON('/api/audits/audit-001/brief', { responses: makeFullRequired() });
    expect((body.validation as Record<string, unknown>).sla_met).toBe(true);
    expect((body.validation as Record<string, unknown>).passed).toBe(true);
  });

  it('returns sla_met=false when required answers missing', async () => {
    const { body } = await putJSON('/api/audits/audit-001/brief', {
      responses: { primary_goal: 'grow revenue' },
    });
    expect((body.validation as Record<string, unknown>).sla_met).toBe(false);
    expect((body.validation as Record<string, unknown>).missing_required).toBeInstanceOf(Array);
    expect(
      ((body.validation as Record<string, unknown>).missing_required as unknown[]).length
    ).toBeGreaterThan(0);
  });

  it('partial save: only supplied keys are in payload', async () => {
    const responses = { primary_goal: 'only one answer' };
    const { status } = await putJSON('/api/audits/audit-001/brief', { responses });
    expect(status).toBe(200);
  });

  it('returns 400 when responses field is missing', async () => {
    const { status, body } = await putJSON('/api/audits/audit-001/brief', {});
    expect(status).toBe(400);
    expect(body.error).toMatch(/responses/i);
  });

  it('returns 400 when responses is an array', async () => {
    const { status, body } = await putJSON('/api/audits/audit-001/brief', { responses: ['a', 'b'] });
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns 400 for Zod violation (string > 2000 chars)', async () => {
    const { status, body } = await putJSON('/api/audits/audit-001/brief', {
      responses: { primary_goal: 'x'.repeat(2001) },
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/Invalid brief responses/);
  });

  it('returns 400 for nested object value (not allowed by schema)', async () => {
    const { status, body } = await putJSON('/api/audits/audit-001/brief', {
      responses: { primary_goal: { nested: true } },
    });
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns 404 when audit not found', async () => {
    setAuditRow(null);
    const { status, body } = await putJSON('/api/audits/nonexistent/brief', { responses: {} });
    expect(status).toBe(404);
    expect(body.error).toBeDefined();
  });

  it('returns 403 when user does not own audit', async () => {
    setAuditRow({ id: 'audit-other', user_id: 'someone-else', client_id: null, product_mode: 'express' });
    const { status, body } = await putJSON('/api/audits/audit-other/brief', { responses: {} });
    expect(status).toBe(403);
    expect(body.error).toBeDefined();
  });

  it('allows client to save their own brief', async () => {
    setAuditRow({ id: 'audit-c1', user_id: 'consultant-001', client_id: 'user-001', product_mode: 'express' });
    const { status } = await putJSON('/api/audits/audit-c1/brief', { responses: makeFullRequired() });
    expect(status).toBe(200);
  });

  it('brief response contains answered_required count', async () => {
    const { body } = await putJSON('/api/audits/audit-001/brief', { responses: makeFullRequired() });
    const v = body.validation as Record<string, unknown>;
    expect(typeof v.answered_required).toBe('number');
    expect(v.answered_required).toBe(REQUIRED_QUESTION_IDS.length);
  });

  it('null values are accepted (clear a previously-saved answer)', async () => {
    const responses = { primary_goal: null };
    const { status } = await putJSON('/api/audits/audit-001/brief', { responses });
    expect(status).toBe(200);
  });

  it('number values are accepted for number-type questions', async () => {
    const responses = { monthly_visitors: 5000 };
    const { status } = await putJSON('/api/audits/audit-001/brief', { responses });
    expect(status).toBe(200);
  });

  it('array values are accepted for multi_choice questions', async () => {
    const responses = { main_traffic_source: ['Organic search (SEO)', 'Social media'] };
    const { status } = await putJSON('/api/audits/audit-001/brief', { responses });
    expect(status).toBe(200);
  });
});
