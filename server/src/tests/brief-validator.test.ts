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
    select: vi.fn(() => ({
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(() => {
        if (table === 'audits') return Promise.resolve({ data: { product_mode: auditMode }, error: null });
        if (table === 'intake_brief') return Promise.resolve({ data: briefRow, error: briefRow ? null : { code: 'PGRST116', message: 'No rows' } });
        return Promise.resolve({ data: null, error: null });
      }),
    })),
    upsert: vi.fn((payload: unknown) => {
      upsertCalls.push({ table, payload });
      return {
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'brief-id-001',
              audit_id: 'audit-001',
              responses: (payload as Record<string, unknown>).responses ?? {},
              status: (payload as Record<string, unknown>).status ?? 'draft',
              sla_met: (payload as Record<string, unknown>).sla_met ?? false,
              answered_required: (payload as Record<string, unknown>).answered_required ?? 0,
              answered_recommended: (payload as Record<string, unknown>).answered_recommended ?? 0,
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

import { validateBriefResponses, assertBriefReady, saveBriefResponses } from '../services/brief-validator.js';
import { REQUIRED_QUESTION_IDS, RECOMMENDED_QUESTION_IDS, BRIEF_QUESTIONS } from '../schemas/intake-brief.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns a responses object with all required questions answered */
function makeFullRequired(): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const id of REQUIRED_QUESTION_IDS) {
    const q = BRIEF_QUESTIONS.find(q => q.id === id)!;
    if (q.type === 'number') r[id] = 1000;
    else if (q.type === 'multi_choice') r[id] = [q.options![0]];
    else r[id] = q.options ? q.options[0] : 'Test answer';
  }
  return r;
}

function makeFullRecommended(): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const id of RECOMMENDED_QUESTION_IDS) {
    const q = BRIEF_QUESTIONS.find(q => q.id === id)!;
    if (q.type === 'number') r[id] = 500;
    else if (q.type === 'multi_choice') r[id] = [q.options![0]];
    else r[id] = q.options ? q.options[0] : 'Answer';
  }
  return r;
}

// ─── validateBriefResponses — pure function ───────────────────────────────────

describe('validateBriefResponses()', () => {
  it('returns sla_met=false and all required missing when responses is empty', () => {
    const result = validateBriefResponses({});
    expect(result.sla_met).toBe(false);
    expect(result.passed).toBe(false);
    expect(result.answered_required).toBe(0);
    expect(result.total_required).toBe(REQUIRED_QUESTION_IDS.length);
    expect(result.missing_required).toHaveLength(REQUIRED_QUESTION_IDS.length);
  });

  it('counts only answered required questions', () => {
    const responses: Record<string, unknown> = {};
    const firstThree = REQUIRED_QUESTION_IDS.slice(0, 3);
    firstThree.forEach(id => { responses[id] = 'answered'; });

    const result = validateBriefResponses(responses);
    expect(result.answered_required).toBe(3);
    expect(result.missing_required).toHaveLength(REQUIRED_QUESTION_IDS.length - 3);
    expect(result.sla_met).toBe(false);
  });

  it('returns sla_met=true when all required are answered', () => {
    const result = validateBriefResponses(makeFullRequired());
    expect(result.sla_met).toBe(true);
    expect(result.passed).toBe(true);
    expect(result.answered_required).toBe(REQUIRED_QUESTION_IDS.length);
    expect(result.missing_required).toHaveLength(0);
  });

  it('counts recommended independently', () => {
    const responses = { ...makeFullRequired(), ...makeFullRecommended() };
    const result = validateBriefResponses(responses);
    expect(result.sla_met).toBe(true);
    expect(result.answered_recommended).toBe(RECOMMENDED_QUESTION_IDS.length);
    expect(result.total_recommended).toBe(RECOMMENDED_QUESTION_IDS.length);
  });

  it('treats empty string as unanswered', () => {
    const responses: Record<string, unknown> = {};
    REQUIRED_QUESTION_IDS.forEach(id => { responses[id] = ''; });
    const result = validateBriefResponses(responses);
    expect(result.answered_required).toBe(0);
    expect(result.sla_met).toBe(false);
  });

  it('treats null as unanswered', () => {
    const responses: Record<string, unknown> = {};
    REQUIRED_QUESTION_IDS.forEach(id => { responses[id] = null; });
    const result = validateBriefResponses(responses);
    expect(result.answered_required).toBe(0);
  });

  it('treats empty array as unanswered', () => {
    const responses: Record<string, unknown> = {};
    REQUIRED_QUESTION_IDS.forEach(id => { responses[id] = []; });
    const result = validateBriefResponses(responses);
    expect(result.answered_required).toBe(0);
  });

  it('treats number 0 as answered', () => {
    const responses = { ...makeFullRequired() };
    // Find a number-type required question if any, otherwise this just verifies
    // that numeric 0 wouldn't incorrectly fail the falsy check
    const numQId = REQUIRED_QUESTION_IDS.find(id => {
      const q = BRIEF_QUESTIONS.find(q => q.id === id);
      return q?.type === 'number';
    });
    if (numQId) {
      responses[numQId] = 0;
      const result = validateBriefResponses(responses);
      // 0 is a valid number answer — should be counted as answered
      expect(result.answered_required).toBe(REQUIRED_QUESTION_IDS.length);
    }
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
    setBriefRow({ responses: makeFullRequired() });
    await expect(assertBriefReady('audit-001')).resolves.toBeUndefined();
  });

  it('resolves for full audit with complete brief', async () => {
    setAuditMode('full');
    setBriefRow({ responses: makeFullRequired() });
    await expect(assertBriefReady('audit-001')).resolves.toBeUndefined();
  });

  it('throws for express audit with no brief row', async () => {
    setAuditMode('express');
    setBriefRow(null);
    await expect(assertBriefReady('audit-001')).rejects.toThrow('Intake brief incomplete');
  });

  it('throws for express audit with missing required questions', async () => {
    setAuditMode('express');
    setBriefRow({ responses: { primary_goal: 'increase revenue' } }); // only 1 of N required
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
    setBriefRow({ responses: makeFullRequired() });
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
    const brief = await saveBriefResponses('audit-001', responses);
    expect(brief).toHaveProperty('id');
    expect(brief).toHaveProperty('audit_id', 'audit-001');
    expect(brief).toHaveProperty('sla_met');
  });

  it('sets sla_met=true when all required answered', async () => {
    const brief = await saveBriefResponses('audit-001', makeFullRequired());
    expect(brief.sla_met).toBe(true);
  });

  it('sets sla_met=false when required questions missing', async () => {
    const brief = await saveBriefResponses('audit-001', { primary_goal: 'grow' });
    expect(brief.sla_met).toBe(false);
  });

  it('upserts with correct answered_required count', async () => {
    await saveBriefResponses('audit-001', makeFullRequired());
    const upsert = getUpsertCalls().find(c => c.table === 'intake_brief');
    expect(upsert).toBeDefined();
    const payload = upsert!.payload as Record<string, unknown>;
    expect(payload.answered_required).toBe(REQUIRED_QUESTION_IDS.length);
  });

  it('upserts with audit_id', async () => {
    await saveBriefResponses('audit-xyz', makeFullRequired());
    const upsert = getUpsertCalls().find(c => c.table === 'intake_brief');
    expect((upsert!.payload as Record<string, unknown>).audit_id).toBe('audit-xyz');
  });

  it('rejects responses with invalid Zod types (string > 2000 chars)', async () => {
    const responses = { primary_goal: 'x'.repeat(2001) };
    await expect(saveBriefResponses('audit-001', responses)).rejects.toThrow(/Invalid brief responses/);
  });

  it('rejects response values that are objects (not allowed by schema)', async () => {
    const responses = { primary_goal: { nested: 'object' } };
    await expect(saveBriefResponses('audit-001', responses)).rejects.toThrow(/Invalid brief responses/);
  });
});

// ─── Schema invariants ────────────────────────────────────────────────────────

describe('BRIEF_QUESTIONS schema invariants', () => {
  it('has 25 questions total', () => {
    expect(BRIEF_QUESTIONS).toHaveLength(25);
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

  it('every required question ID is in REQUIRED_QUESTION_IDS', () => {
    const explicitRequired = BRIEF_QUESTIONS.filter(q => q.priority === 'required').map(q => q.id);
    expect(new Set(explicitRequired)).toEqual(new Set(REQUIRED_QUESTION_IDS));
  });

  it('every recommended question ID is in RECOMMENDED_QUESTION_IDS', () => {
    const explicitRec = BRIEF_QUESTIONS.filter(q => q.priority === 'recommended').map(q => q.id);
    expect(new Set(explicitRec)).toEqual(new Set(RECOMMENDED_QUESTION_IDS));
  });

  it('has between 4 and 10 required questions', () => {
    expect(REQUIRED_QUESTION_IDS.length).toBeGreaterThanOrEqual(4);
    expect(REQUIRED_QUESTION_IDS.length).toBeLessThanOrEqual(10);
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
