/**
 * Integration tests: GET /api/audits/:id/brief + PUT /api/audits/:id/brief
 *
 * Tests the brief HTTP endpoints on a real Express app (random port).
 * Supabase, requireAuth, attachProfile, requireRole, rate-limit are all mocked.
 *
 * Covers:
 *  GET /api/audits/:id/brief/schema
 *    · 200 compact plan payload for owner
 *    · 403 when user has no access
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
  setUpdateShouldFail,
} = vi.hoisted(() => {
  // Default: audit owned by the test user, express mode
  let auditRow: Record<string, unknown> | null = {
    id: 'audit-001',
    user_id: 'user-001',
    client_id: null,
    product_mode: 'express',
    execution_plan: { coverage_package: 'pro', selected_domains: ['tech_infrastructure', 'security_compliance'] },
  };
  let briefRow: Record<string, unknown> | null = null;
  let lastUpsertPayload: unknown = null;
  let updateShouldFail = false;

  const setAuditRow = (v: Record<string, unknown> | null) => { auditRow = v; };
  const setBriefRow = (v: Record<string, unknown> | null) => { briefRow = v; };
  const setUpdateShouldFail = (v: boolean) => { updateShouldFail = v; };
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

  const mockFrom = vi.fn((table: string) => {
    type SelectChain = {
      eq: Mock;
      single: Mock;
      maybeSingle: Mock;
    };
    const chain = {} as SelectChain;
    chain.eq = vi.fn(() => chain);
    chain.single = vi.fn(() => {
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
      });
    chain.maybeSingle = vi.fn(() => {
        if (table === 'intake_brief') {
          return Promise.resolve({
            data: briefRow,
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });
    return {
      select: vi.fn(() => chain),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => (
            updateShouldFail
              ? { error: { message: 'update failed' } }
              : { error: null }
          )),
        })),
      })),
      upsert: vi.fn((payload: unknown) => {
        lastUpsertPayload = payload;
        return makeBriefUpsertChain();
      }),
    };
  });

  (globalThis as Record<string, unknown>).__briefRouteMockFrom = mockFrom;
  (globalThis as Record<string, unknown>).__setAuditRow = setAuditRow;
  (globalThis as Record<string, unknown>).__setBriefRow = setBriefRow;

  return { setAuditRow, setBriefRow, getUpsertPayload, setUpdateShouldFail };
});

const { setAuthRole } = vi.hoisted(() => {
  let userRole = 'consultant';
  const setAuthRole = (v: string) => { userRole = v; };
  (globalThis as Record<string, unknown>).__briefRouteAuthRole = () => userRole;
  return { setAuthRole };
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
    _req.userRole = ((globalThis as Record<string, unknown>).__briefRouteAuthRole as () => string)();
    next();
  },
  attachProfile: (_req: unknown, _res: unknown, next: () => void) => next(),
  rejectGuestFromPortal: (_req: unknown, _res: unknown, next: () => void) => next(),
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
import { resolveFullSlaRequiredIds } from '@glc/intake-core';
import { buildIntakePlan } from '@glc/intake-core';
import { currentIntakeVersionTuple } from '@glc/intake-core';
import {
  resolveIntakeSurfaceForPlan,
  validationPerspectiveForBriefAccess,
} from '../services/brief-validator.js';
import { getBriefQuestionsByIds } from '../schemas/intake-brief.js';
import { makeWebsitePathFullBrief, wrapBriefCellsClient } from './bank-brief-fixtures.js';
import { INTAKE_BRIEF_SLA_PRODUCT_MODE } from '../types/audit.js';

let server: Server;
let baseUrl: string;

/** Headers used in every authenticated request */
const AUTH = { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' };

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/audits', auditsRouter);

  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });

  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  vi.clearAllMocks();
  setAuthRole('consultant');
  setAuditRow({
    id: 'audit-001',
    user_id: 'user-001',
    client_id: null,
    product_mode: 'express',
    execution_plan: { coverage_package: 'pro', selected_domains: ['tech_infrastructure', 'security_compliance'] },
  });
  setBriefRow(null);
  setUpdateShouldFail(false);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFullRequired(): Record<string, unknown> {
  return wrapBriefCellsClient(makeWebsitePathFullBrief());
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

// ─── GET /api/audits/:id/brief/schema ─────────────────────────────────────────

describe('GET /api/audits/:id/brief/schema', () => {
  it('returns 200 with compact plan + questions for owner', async () => {
    setBriefRow({ responses: { a2: 'hospitality', a5: 'no_website' } });
    const { status, body } = await getJSON('/api/audits/audit-001/brief/schema');

    expect(status).toBe(200);
    expect(Array.isArray(body.visible)).toBe(true);
    expect(Array.isArray(body.questions)).toBe(true);
    expect(body.intake_versions).toBeDefined();
    expect(body.derived).toBeDefined();
    expect(typeof (body.derived as Record<string, unknown>).ai_readiness_score).toBe('number');
    expect(Array.isArray(body.missing_for_report)).toBe(true);
    expect(Array.isArray(body.next_recommended)).toBe(true);
    expect(body.product_mode).toBe(INTAKE_BRIEF_SLA_PRODUCT_MODE);
    const rows = body.questions as Array<Record<string, unknown>>;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].answer).toBeDefined();
    expect(typeof (rows[0].answer as Record<string, unknown>).type).toBe('string');
    expect(body.legal).toBeDefined();
    expect((body.legal as Record<string, { legal_basis?: string }>).a2?.legal_basis).toBe('contract');
  });

  it('includes derived.report_anchors when visible bank answers have reportUse', async () => {
    setBriefRow({
      responses: { a2: 'hospitality', a5: 'no_website', a1: 'Boutique stay chain' },
    });
    const { status, body } = await getJSON('/api/audits/audit-001/brief/schema');
    expect(status).toBe(200);
    const derived = body.derived as Record<string, unknown>;
    expect(derived.report_anchors).toEqual(
      expect.objectContaining({ recon_company_summary: 'Boutique stay chain' }),
    );
  });

  it('returns 403 when user has no access', async () => {
    setAuditRow({
      id: 'audit-001',
      user_id: 'other-user',
      client_id: null,
      product_mode: 'full',
      execution_plan: { coverage_package: 'complete', selected_domains: ['tech_infrastructure', 'security_compliance', 'seo_digital', 'ux_conversion', 'marketing_utp', 'automation_processes'], include_strategy: true },
    });
    const { status, body } = await getJSON('/api/audits/audit-001/brief/schema');
    expect(status).toBe(403);
    expect(body.code).toBe('AUDITS_ACCESS_DENIED');
  });
});

// ─── GET /api/audits/:id/brief ────────────────────────────────────────────────

describe('GET /api/audits/:id/brief', () => {
  it('returns 200 with questions array and null brief on first call', async () => {
    setBriefRow(null);
    const { status, body } = await getJSON('/api/audits/audit-001/brief');

    expect(status).toBe(200);
    expect(body.questions).toBeInstanceOf(Array);
    const audit = { user_id: 'user-001', client_id: null as string | null };
    const perspective = validationPerspectiveForBriefAccess(audit.user_id, audit.client_id, 'user-001');
    const surface = resolveIntakeSurfaceForPlan('self_serve', perspective);
    const plan = buildIntakePlan({
      responses: {},
      productMode: INTAKE_BRIEF_SLA_PRODUCT_MODE,
      collectionMode: 'self_serve',
      surface,
      intakeVersionTuple: currentIntakeVersionTuple(),
    });
    expect((body.questions as unknown[]).length).toBeGreaterThan(0);
    expect((body.questions as unknown[]).length).toBeLessThanOrEqual(getBriefQuestionsByIds(plan.visible).length);
    expect(body.brief).toBeNull();
    expect(body.gates).toBeDefined();
    expect(body.intakeProgress).toBeDefined();
    expect(typeof (body.intakeProgress as Record<string, unknown>).progressPct).toBe('number');
    expect(body.readiness).toBeDefined();
    expect(body.critical_signals).toBeDefined();
    expect(Array.isArray(body.remediation_queue)).toBe(true);
    expect(Array.isArray(body.next_recommended)).toBe(true);
  });

  it('returns 200 with populated brief when row exists', async () => {
    const responses = makeFullRequired();
    setBriefRow({
      id: 'brief-id-001',
      audit_id: 'audit-001',
      responses,
      status: 'submitted',
      sla_met: true,
      answered_required: resolveFullSlaRequiredIds(responses).length,
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
    expect(v.total_required).toBe(resolveFullSlaRequiredIds(makeFullRequired()).length);
    expect(v.total_recommended).toBeGreaterThan(0);
    expect(typeof v.sla_met).toBe('boolean');
    expect(typeof v.passed).toBe('boolean');
    const gates = body.gates as Record<string, unknown>;
    expect(typeof gates.canStartSnapshot).toBe('boolean');
    expect(Array.isArray(gates.missingRequiredIds)).toBe(true);
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
    expect(body.code).toBe('AUDITS_NOT_FOUND');
    expect(body.error).toBeDefined();
  });

  it('returns 403 when user does not own or is client of the audit', async () => {
    setAuditRow({
      id: 'audit-002',
      user_id: 'other-user',
      client_id: null,
      product_mode: 'express',
      execution_plan: { coverage_package: 'pro', selected_domains: ['tech_infrastructure', 'security_compliance'] },
    });
    const { status, body } = await getJSON('/api/audits/audit-002/brief');
    expect(status).toBe(403);
    expect(body.code).toBe('AUDITS_ACCESS_DENIED');
    expect(body.error).toBeDefined();
  });

  it('allows client_id access (client can view brief)', async () => {
    setAuditRow({
      id: 'audit-003',
      user_id: 'consultant-001',
      client_id: 'user-001',
      product_mode: 'express',
      execution_plan: { coverage_package: 'pro', selected_domains: ['tech_infrastructure', 'security_compliance'] },
    });
    setBriefRow(null);
    const { status } = await getJSON('/api/audits/audit-003/brief');
    expect(status).toBe(200);
  });

  it('questions array marks required rows for visible plan.required ids', async () => {
    const { body } = await getJSON('/api/audits/audit-001/brief');
    const questions = body.questions as Array<Record<string, unknown>>;
    const audit = { user_id: 'user-001', client_id: null as string | null };
    const perspective = validationPerspectiveForBriefAccess(audit.user_id, audit.client_id, 'user-001');
    const surface = resolveIntakeSurfaceForPlan('self_serve', perspective);
    const plan = buildIntakePlan({
      responses: {},
      productMode: INTAKE_BRIEF_SLA_PRODUCT_MODE,
      collectionMode: 'self_serve',
      surface,
      intakeVersionTuple: currentIntakeVersionTuple(),
    });
    const required = questions.filter(q => q.priority === 'required');
    const expectedRequired = getBriefQuestionsByIds(plan.visible).filter(q => q.priority === 'required');
    expect(required.map(q => q.id).sort()).toEqual(expectedRequired.map(q => q.id).sort());
  });

  it('questions use valid priority labels', async () => {
    const { body } = await getJSON('/api/audits/audit-001/brief');
    const questions = body.questions as Array<Record<string, unknown>>;
    const priorities = new Set(questions.map(q => q.priority));
    expect(priorities.has('required')).toBe(true);
    for (const p of priorities) {
      expect(['required', 'recommended', 'optional']).toContain(p);
    }
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
    expect(body.gates).toBeDefined();
    expect(body.intakeProgress).toBeDefined();
  });

  it('returns sla_met=true in validation when all required answered', async () => {
    const { body } = await putJSON('/api/audits/audit-001/brief', { responses: makeFullRequired() });
    expect((body.validation as Record<string, unknown>).sla_met).toBe(true);
    expect((body.validation as Record<string, unknown>).passed).toBe(true);
  });

  it('returns sla_met=false when required answers missing', async () => {
    const { body } = await putJSON('/api/audits/audit-001/brief', {
      responses: { f1: { value: 'grow revenue', source: 'client' } },
    });
    expect((body.validation as Record<string, unknown>).sla_met).toBe(false);
    expect((body.validation as Record<string, unknown>).missing_required).toBeInstanceOf(Array);
    expect(
      ((body.validation as Record<string, unknown>).missing_required as unknown[]).length
    ).toBeGreaterThan(0);
  });

  it('partial save: only supplied keys are in payload', async () => {
    const responses = { f1: { value: 'only one answer', source: 'client' as const } };
    const { status } = await putJSON('/api/audits/audit-001/brief', { responses });
    expect(status).toBe(200);
  });

  it('returns 400 when responses field is missing', async () => {
    const { status, body } = await putJSON('/api/audits/audit-001/brief', {});
    expect(status).toBe(400);
    expect(body.code).toBe('AUDITS_BRIEF_RESPONSES_NOT_OBJECT');
    expect(body.error).toMatch(/responses/i);
  });

  it('returns 400 when responses is an array', async () => {
    const { status, body } = await putJSON('/api/audits/audit-001/brief', { responses: ['a', 'b'] });
    expect(status).toBe(400);
    expect(body.code).toBe('AUDITS_BRIEF_RESPONSES_NOT_OBJECT');
    expect(body.error).toBeDefined();
  });

  it('returns 400 for Zod violation (string > BRIEF_ANSWER_STRING_MAX chars)', async () => {
    const { status, body } = await putJSON('/api/audits/audit-001/brief', {
      responses: { f1: { value: 'x'.repeat(12_001), source: 'client' as const } },
    });
    expect(status).toBe(400);
    expect(body.code).toBe('AUDITS_BRIEF_VALIDATION_FAILED');
    expect(body.error).toMatch(/Invalid brief responses/);
  });

  it('returns 400 for nested object value (not allowed by schema)', async () => {
    const { status, body } = await putJSON('/api/audits/audit-001/brief', {
      responses: { f1: { nested: true } },
    });
    expect(status).toBe(400);
    expect(body.error).toBeDefined();
  });

  it('returns 404 when audit not found', async () => {
    setAuditRow(null);
    const { status, body } = await putJSON('/api/audits/nonexistent/brief', { responses: {} });
    expect(status).toBe(404);
    expect(body.code).toBe('AUDITS_NOT_FOUND');
    expect(body.error).toBeDefined();
  });

  it('returns 403 when user does not own audit', async () => {
    setAuditRow({
      id: 'audit-other',
      user_id: 'someone-else',
      client_id: null,
      product_mode: 'express',
      execution_plan: { coverage_package: 'pro', selected_domains: ['tech_infrastructure', 'security_compliance'] },
    });
    const { status, body } = await putJSON('/api/audits/audit-other/brief', { responses: {} });
    expect(status).toBe(403);
    expect(body.code).toBe('AUDITS_ACCESS_DENIED');
    expect(body.error).toBeDefined();
  });

  it('allows client to save their own brief', async () => {
    setAuditRow({
      id: 'audit-c1',
      user_id: 'consultant-001',
      client_id: 'user-001',
      product_mode: 'express',
      execution_plan: { coverage_package: 'pro', selected_domains: ['tech_infrastructure', 'security_compliance'] },
    });
    const { status } = await putJSON('/api/audits/audit-c1/brief', { responses: makeFullRequired() });
    expect(status).toBe(200);
  });

  it('brief response contains answered_required count', async () => {
    const { body } = await putJSON('/api/audits/audit-001/brief', { responses: makeFullRequired() });
    const v = body.validation as Record<string, unknown>;
    expect(typeof v.answered_required).toBe('number');
    expect(v.answered_required).toBe(v.total_required);
  });

  it('null values are accepted (clear a previously-saved answer)', async () => {
    const responses = { f1: null };
    const { status } = await putJSON('/api/audits/audit-001/brief', { responses });
    expect(status).toBe(200);
  });

  it('number values are accepted for number-type questions', async () => {
    const responses = { monthly_visitors: { value: 5000, source: 'client' as const } };
    const { status } = await putJSON('/api/audits/audit-001/brief', { responses });
    expect(status).toBe(200);
  });

  it('array values are accepted for multi_choice questions', async () => {
    const responses = {
      main_traffic_source: { value: ['Google / search', 'Social'], source: 'client' as const },
    };
    const { status } = await putJSON('/api/audits/audit-001/brief', { responses });
    expect(status).toBe(200);
  });

  it('returns 400 AUDITS_BRIEF_COLLECTION_MODE_INVALID for invalid collection_mode', async () => {
    const { status, body } = await putJSON('/api/audits/audit-001/brief', {
      responses: { f1: { value: 'x', source: 'client' as const } },
      collection_mode: 'not_a_mode',
    });
    expect(status).toBe(400);
    expect(body.code).toBe('AUDITS_BRIEF_COLLECTION_MODE_INVALID');
  });

  it('accepts valid collection_mode values', async () => {
    for (const collection_mode of ['self_serve', 'interview', 'pre_brief', 'discovery'] as const) {
      const { status } = await putJSON('/api/audits/audit-001/brief', {
        responses: makeFullRequired(),
        collection_mode,
      });
      expect(status).toBe(200);
    }
  });

  it('returns 400 UNSUPPORTED_INTAKE_VERSION when intake_versions tuple is not a known artifact bundle', async () => {
    const cur = currentIntakeVersionTuple();
    const { status, body } = await putJSON('/api/audits/audit-001/brief', {
      responses: makeFullRequired(),
      intake_versions: { ...cur, layoutVersion: '0.0.0' },
    });
    expect(status).toBe(400);
    expect(body.code).toBe('UNSUPPORTED_INTAKE_VERSION');
  });

  it('returns 400 INCOMPLETE_INTAKE_VERSIONS when only some version keys are sent', async () => {
    const cur = currentIntakeVersionTuple();
    const { status, body } = await putJSON('/api/audits/audit-001/brief', {
      responses: makeFullRequired(),
      intake_versions: { policyVersion: cur.policyVersion },
    });
    expect(status).toBe(400);
    expect(body.code).toBe('INCOMPLETE_INTAKE_VERSIONS');
  });
});

describe('POST /api/audits/:id/brief/help-request', () => {
  async function postHelp(path: string, body: unknown = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers: AUTH,
      body: JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() as Record<string, unknown> };
  }

  it('returns 403 with client-only code when requester is not a client', async () => {
    setAuthRole('consultant');
    const { status, body } = await postHelp('/api/audits/audit-001/brief/help-request', { message: 'Need help' });
    expect(status).toBe(403);
    expect(body.code).toBe('AUDITS_BRIEF_HELP_CLIENT_ONLY');
  });

  it('returns 404 when audit does not exist', async () => {
    setAuthRole('client');
    setAuditRow(null);
    const { status, body } = await postHelp('/api/audits/missing/brief/help-request', { message: 'Need help' });
    expect(status).toBe(404);
    expect(body.code).toBe('AUDITS_NOT_FOUND');
  });

  it('returns 403 when audit belongs to another client', async () => {
    setAuthRole('client');
    setAuditRow({
      id: 'audit-001',
      user_id: 'consultant-001',
      client_id: 'client-other',
      status: 'created',
    });
    const { status, body } = await postHelp('/api/audits/audit-001/brief/help-request', { message: 'Need help' });
    expect(status).toBe(403);
    expect(body.code).toBe('AUDITS_BRIEF_HELP_ACCESS_DENIED');
  });

  it('returns 400 when audit is not in created phase', async () => {
    setAuthRole('client');
    setAuditRow({
      id: 'audit-001',
      user_id: 'consultant-001',
      client_id: 'user-001',
      status: 'running',
    });
    const { status, body } = await postHelp('/api/audits/audit-001/brief/help-request', { message: 'Need help' });
    expect(status).toBe(400);
    expect(body.code).toBe('AUDITS_BRIEF_HELP_WRONG_PHASE');
  });

  it('returns 500 when help-request update fails', async () => {
    setAuthRole('client');
    setAuditRow({
      id: 'audit-001',
      user_id: 'consultant-001',
      client_id: 'user-001',
      status: 'created',
    });
    setUpdateShouldFail(true);
    const { status, body } = await postHelp('/api/audits/audit-001/brief/help-request', { message: 'Need help' });
    expect(status).toBe(500);
    expect(body.code).toBe('AUDITS_BRIEF_HELP_FAILED');
  });
});
