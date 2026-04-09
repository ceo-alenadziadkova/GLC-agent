/**
 * Unit + integration tests: BriefValidator
 *
 * Covers:
 *  - validateBriefResponses() — pure function, no DB
 *    · empty responses: all required missing
 *    · partial: counts correctly
 *    · all required answered: sla_met = true
 *    · non-required extras don't affect sla
 *    · falsy values (empty string, null, []) treated as unanswered
 *    · { value: null, source: 'unknown' } treated as answered for SLA gating
 *    · number 0 treated as answered
 *  - assertBriefReady() — DB-mocked
 *    · free_snapshot audits skip gate unconditionally
 *    · express/full with complete brief: resolves
 *    · express/full with missing required: throws with question list
 *    · no brief row (null): throws
 *  - saveBriefResponses() — DB-mocked
 *    · valid responses saved, stats computed
 *    · invalid Zod schema rejects
 *    · DB error throws
 *
 * Surface / version helpers: see `brief-intake-surface.test.ts`.
 *
 * All Supabase calls are mocked — no real DB.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockFrom, setAuditMode, setBriefRow, getUpsertCalls } = vi.hoisted(() => {
  let auditMode = 'express';
  let briefRow: Record<string, unknown> | null = null;
  const upsertCalls: Array<{ table: string; payload: unknown }> = [];

  const setAuditMode = (m: string) => { auditMode = m; };
  const setBriefRow = (r: Record<string, unknown> | null) => { briefRow = r; };
  const getUpsertCalls = () => upsertCalls;

  const makeChain = (table: string) => ({
    select: vi.fn(() => {
      const chain = {
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(() => {
          if (table === 'intake_brief') {
            return Promise.resolve({ data: briefRow, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        }),
        single: vi.fn(() => {
          if (table === 'audits') return Promise.resolve({ data: { product_mode: auditMode }, error: null });
          if (table === 'intake_brief') return Promise.resolve({ data: briefRow, error: briefRow ? null : { code: 'PGRST116', message: 'No rows' } });
          return Promise.resolve({ data: null, error: null });
        }),
      };
      return chain;
    }),
    upsert: vi.fn((payload: unknown) => {
      upsertCalls.push({ table, payload });
      return {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'brief-id-001',
              audit_id: (payload as Record<string, unknown>).audit_id ?? 'audit-001',
              responses: (payload as Record<string, unknown>).responses ?? {},
              status: (payload as Record<string, unknown>).status ?? 'draft',
              sla_met: (payload as Record<string, unknown>).sla_met ?? false,
              answered_required: (payload as Record<string, unknown>).answered_required ?? 0,
              answered_recommended: (payload as Record<string, unknown>).answered_recommended ?? 0,
              recon_conflicts: (payload as Record<string, unknown>).recon_conflicts ?? [],
              collection_mode: (payload as Record<string, unknown>).collection_mode ?? 'self_serve',
              intake_versions: (payload as Record<string, unknown>).intake_versions ?? null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            error: null,
          })),
        })),
      };
    }),
  });

  const mockFrom = vi.fn((table: string) => makeChain(table));

  (globalThis as Record<string, unknown>).__mockBriefFrom = mockFrom;
  (globalThis as Record<string, unknown>).__briefUpsertCalls = upsertCalls;

  return { mockFrom, setAuditMode, setBriefRow, getUpsertCalls };
});

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__mockBriefFrom },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  validateBriefResponses,
  assertBriefReady,
  saveBriefResponses,
  arePreBriefSlotsSatisfied,
} from '../services/brief-validator.js';
import { RECOMMENDED_QUESTION_IDS, BRIEF_QUESTIONS } from '../schemas/intake-brief.js';
import { resolveBankRecommendedIds, resolveFullSlaRequiredIds } from '../intake/brief-gates.js';
import {
  makeWebsitePathExpressBrief,
  makeWebsitePathFullBrief,
} from './bank-brief-fixtures.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFullRequired(): Record<string, unknown> {
  return makeWebsitePathFullBrief();
}

function makeFullWithAllRecommended(): Record<string, unknown> {
  const r = { ...makeWebsitePathFullBrief() };
  for (const id of resolveBankRecommendedIds(r)) {
    if (r[id] !== undefined) continue;
    if (id === 'f2') {
      r[id] = ['Website performance and technology (speed, stability, technical health)'];
    } else if (id === 'b2' || id === 'd1') {
      r[id] = ['Google'];
    } else {
      r[id] = 'Answer';
    }
  }
  return r;
}

// ─── validateBriefResponses — pure function ───────────────────────────────────

describe('validateBriefResponses()', () => {
  it('returns sla_met=false and all required missing when responses is empty', () => {
    const fullReq = resolveFullSlaRequiredIds({});
    const result = validateBriefResponses({});
    expect(result.sla_met).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.answered_required).toBe(0);
    expect(result.total_required).toBe(fullReq.length);
    expect(result.missing_required).toHaveLength(fullReq.length);
  });

  it('counts only answered required questions', () => {
    const responses: Record<string, unknown> = {};
    const fullReq = resolveFullSlaRequiredIds({});
    const firstThree = fullReq.slice(0, 3);
    firstThree.forEach(id => { responses[id] = 'answered'; });

    const result = validateBriefResponses(responses);
    expect(result.answered_required).toBe(3);
    expect(result.missing_required).toHaveLength(fullReq.length - 3);
    expect(result.sla_met).toBe(false);
  });

  it('returns sla_met=true when all required are answered', () => {
    const full = makeFullRequired();
    const result = validateBriefResponses(full);
    expect(result.sla_met).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.answered_required).toBe(resolveFullSlaRequiredIds(full).length);
    expect(result.missing_required).toHaveLength(0);
  });

  it('counts recommended independently', () => {
    const responses = makeFullWithAllRecommended();
    const result = validateBriefResponses(responses);
    expect(result.sla_met).toBe(true);
    const nRec = resolveBankRecommendedIds(responses).length;
    expect(result.answered_recommended).toBe(nRec);
    expect(result.total_recommended).toBe(nRec);
  });

  it('treats empty string as unanswered', () => {
    const responses: Record<string, unknown> = {};
    const fullReq = resolveFullSlaRequiredIds({});
    fullReq.forEach(id => { responses[id] = ''; });
    const result = validateBriefResponses(responses);
    expect(result.answered_required).toBe(0);
    expect(result.sla_met).toBe(false);
  });

  it('treats null as unanswered', () => {
    const responses: Record<string, unknown> = {};
    resolveFullSlaRequiredIds({}).forEach(id => { responses[id] = null; });
    const result = validateBriefResponses(responses);
    expect(result.answered_required).toBe(0);
  });

  it('treats explicit source=unknown as answered for required gating', () => {
    const responses: Record<string, unknown> = {};
    resolveFullSlaRequiredIds({}).forEach(id => {
      responses[id] = { value: null, source: 'unknown' };
    });
    const result = validateBriefResponses(responses);
    expect(result.answered_required).toBe(resolveFullSlaRequiredIds({}).length);
    expect(result.sla_met).toBe(true);
  });

  it('mixes real answers with source=unknown and still meets SLA', () => {
    const responses = makeFullRequired();
    const firstId = resolveFullSlaRequiredIds(responses)[0];
    responses[firstId] = { value: null, source: 'unknown' };
    const result = validateBriefResponses(responses);
    expect(result.answered_required).toBe(resolveFullSlaRequiredIds(responses).length);
    expect(result.sla_met).toBe(true);
  });

  it('treats empty array as unanswered', () => {
    const responses: Record<string, unknown> = {};
    resolveFullSlaRequiredIds({}).forEach(id => { responses[id] = []; });
    const result = validateBriefResponses(responses);
    expect(result.answered_required).toBe(0);
  });

  it('extra optional/recommended answers do not affect sla_met', () => {
    const responses = { ...makeFullRequired(), extra_key: 'value', budget_for_changes: '€5k – €20k' };
    const result = validateBriefResponses(responses);
    expect(result.sla_met).toBe(true);
  });

  it('missing_required contains question text for UX', () => {
    const result = validateBriefResponses({});
    expect(result.missing_required[0]).toHaveProperty('id');
    expect(result.missing_required[0]).toHaveProperty('question');
    expect(typeof result.missing_required[0].question).toBe('string');
    expect(result.missing_required[0].question.length).toBeGreaterThan(5);
  });
});

// ─── assertBriefReady() — DB-mocked ──────────────────────────────────────────

describe('assertBriefReady()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUpsertCalls().length = 0;
    setAuditMode('express');
    setBriefRow(null);
  });

  it('resolves immediately for free_snapshot (no brief required)', async () => {
    setAuditMode('free_snapshot');
    await expect(assertBriefReady('audit-001')).resolves.toBeUndefined();
  });

  it('resolves for express audit with complete brief', async () => {
    setAuditMode('express');
    setBriefRow({ responses: makeWebsitePathExpressBrief() });
    await expect(assertBriefReady('audit-001')).resolves.toBeUndefined();
  });

  it('resolves for full audit with complete brief', async () => {
    setAuditMode('full');
    setBriefRow({ responses: makeWebsitePathFullBrief() });
    await expect(assertBriefReady('audit-001')).resolves.toBeUndefined();
  });

  it('throws for express audit with no brief row', async () => {
    setAuditMode('express');
    setBriefRow(null);
    await expect(assertBriefReady('audit-001')).rejects.toThrow('Intake brief incomplete');
  });

  it('throws for express audit with missing required questions', async () => {
    setAuditMode('express');
    setBriefRow({ responses: { f1: 'increase revenue' } });
    await expect(assertBriefReady('audit-001')).rejects.toThrow(/Intake brief incomplete/);
  });

  it('error message lists missing question text', async () => {
    setAuditMode('express');
    setBriefRow({ responses: {} });
    try {
      await assertBriefReady('audit-001');
      throw new Error('should have thrown');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toMatch(/required question/i);
      // Should contain at least one question mark (question text)
      expect(msg).toContain('?');
    }
  });

  it('upserts brief stats to DB when validating', async () => {
    setAuditMode('express');
    setBriefRow({ responses: makeWebsitePathExpressBrief() });
    await assertBriefReady('audit-001');
    const briefUpsert = getUpsertCalls().find(c => c.table === 'intake_brief');
    expect(briefUpsert).toBeDefined();
    expect((briefUpsert!.payload as Record<string, unknown>).sla_met).toBe(true);
  });
});

// ─── saveBriefResponses() — DB-mocked ────────────────────────────────────────

describe('saveBriefResponses()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUpsertCalls().length = 0;
  });

  it('saves valid responses and returns IntakeBrief record', async () => {
    const responses = makeFullRequired();
    const { brief } = await saveBriefResponses('audit-001', responses);
    expect(brief).toHaveProperty('id');
    expect(brief).toHaveProperty('audit_id', 'audit-001');
    expect(brief).toHaveProperty('sla_met');
  });

  it('sets sla_met=true when all required answered', async () => {
    const { brief } = await saveBriefResponses('audit-001', makeFullRequired());
    expect(brief.sla_met).toBe(true);
  });

  it('sets sla_met=false when required questions missing', async () => {
    const { brief } = await saveBriefResponses('audit-001', { f1: 'grow' });
    expect(brief.sla_met).toBe(false);
  });

  it('upserts with correct answered_required count', async () => {
    const full = makeFullRequired();
    const { validation } = await saveBriefResponses('audit-001', full);
    const upsert = getUpsertCalls().find(c => c.table === 'intake_brief');
    expect(upsert).toBeDefined();
    const payload = upsert!.payload as Record<string, unknown>;
    expect(payload.answered_required).toBe(validation.answered_required);
    expect(payload.total_required).toBe(validation.total_required);
  });

  it('upserts with audit_id', async () => {
    await saveBriefResponses('audit-xyz', makeFullRequired());
    const upsert = getUpsertCalls().find(c => c.table === 'intake_brief');
    expect((upsert!.payload as Record<string, unknown>).audit_id).toBe('audit-xyz');
  });

  it('persists intake_versions from buildIntakePlan', async () => {
    await saveBriefResponses('audit-001', makeFullRequired());
    const upsert = getUpsertCalls().find(c => c.table === 'intake_brief');
    const iv = (upsert!.payload as Record<string, unknown>).intake_versions as Record<string, string>;
    expect(iv.questionBankVersion).toBe('1.1.0');
    expect(iv.policyVersion).toBe('1.1.0');
    expect(iv.layoutVersion).toBe('1.1.0');
    expect(iv.resolverVersion).toBe('1.1.0');
  });

  it('rejects responses with invalid Zod types (string over BRIEF_ANSWER_STRING_MAX)', async () => {
    const responses = { f1: 'x'.repeat(12_001) };
    await expect(saveBriefResponses('audit-001', responses)).rejects.toThrow(/Invalid brief responses/);
  });

  it('rejects malformed structured response objects', async () => {
    const responses = { f1: { nested: 'object' } };
    await expect(saveBriefResponses('audit-001', responses)).rejects.toThrow(/Invalid brief responses/);
  });
});

// ─── Schema invariants ────────────────────────────────────────────────────────

describe('BRIEF_QUESTIONS schema invariants', () => {
  it('has 28 main brief questions (identity is separate for public /intake link only)', () => {
    expect(BRIEF_QUESTIONS).toHaveLength(28);
  });

  it('all question IDs are unique', () => {
    const ids = BRIEF_QUESTIONS.map(q => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every question has a non-empty question text', () => {
    for (const q of BRIEF_QUESTIONS) {
      expect(q.question.length).toBeGreaterThan(10);
    }
  });

  it('choice questions have at least 2 options', () => {
    for (const q of BRIEF_QUESTIONS) {
      if (q.type === 'single_choice' || q.type === 'multi_choice') {
        expect(q.options!.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('every recommended question ID is in RECOMMENDED_QUESTION_IDS', () => {
    const explicitRec = BRIEF_QUESTIONS.filter(q => q.priority === 'recommended').map(q => q.id);
    expect(new Set(explicitRec)).toEqual(new Set(RECOMMENDED_QUESTION_IDS));
  });

  it('has between 4 and 14 schema-marked required questions (legacy form copy)', () => {
    const n = BRIEF_QUESTIONS.filter(q => q.priority === 'required').length;
    expect(n).toBeGreaterThanOrEqual(4);
    expect(n).toBeLessThanOrEqual(14);
  });

  it('all domain references are valid domain keys or "all"', () => {
    const VALID_DOMAINS = [
      'all',
      'tech_infrastructure', 'security_compliance', 'seo_digital',
      'ux_conversion', 'marketing_utp', 'automation_processes',
    ];
    for (const q of BRIEF_QUESTIONS) {
      for (const domain of q.domains) {
        expect(VALID_DOMAINS).toContain(domain);
      }
    }
  });
});

describe('arePreBriefSlotsSatisfied', () => {
  const minimalPreBrief = {
    intake_company_website: 'https://example.com',
    intake_company_name: 'Acme',
    intake_industry: 'Hospitality',
    a5: 'Yes, multi-page site',
    revenue_model: 'Lead generation',
    f1: 'More direct bookings',
    b1: 'Travelers 30–50',
    a6: 'Yes',
    c5: 'Book now',
    c3: 'Yes, GA4',
  };

  it('passes without optional bank fields f2, a7, f8', () => {
    expect(arePreBriefSlotsSatisfied(minimalPreBrief)).toBe(true);
  });

  it('fails when a required submit slot is missing', () => {
    const { c3: _, ...rest } = minimalPreBrief;
    expect(arePreBriefSlotsSatisfied(rest)).toBe(false);
  });

  it('requires clarification when analytics choice needs specify', () => {
    const withOtherTool = { ...minimalPreBrief, c3: 'Yes, another tool' };
    expect(arePreBriefSlotsSatisfied(withOtherTool)).toBe(false);
    expect(arePreBriefSlotsSatisfied({
      ...withOtherTool,
      c3__other: 'Plausible',
    })).toBe(true);
  });
});
