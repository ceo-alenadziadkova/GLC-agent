/**
 * BanditService unit tests — Phase 6 / Sprint 2
 *
 * Covers:
 *   - All 5 readiness gate miss paths (BANDIT_DISABLED, NO_NON_DEFAULT_VARIANTS,
 *     TOO_MANY_VARIANTS, INSUFFICIENT_PHASES_WITH_DATA, INSUFFICIENT_ARM_RUNS)
 *   - DB_ERROR fallback (supabase throws)
 *   - ε-greedy exploration (Math.random < epsilon → random arm)
 *   - ε-greedy exploitation (Math.random ≥ epsilon → highest avg_score arm)
 *   - recordArmResult: incremental rolling average (new row + update path)
 *
 * All Supabase and config dependencies are mocked; no real DB calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mock references ──────────────────────────────────────────────────
//
// Must be hoisted so vi.mock factories can close over them without TDZ issues.

const mocks = vi.hoisted(() => {
  const isBanditsEnabledFn = vi.fn(() => false);

  const hasNonDefaultVariantsFn = vi.fn<(phaseId: string) => boolean>(() => false);
  const getVariantsForPhaseFn = vi.fn<(phaseId: string) => unknown[]>(() => []);

  // Mutable supabase chain — reassigned per test via mockSupabaseImpl
  let supabaseImpl: Record<string, unknown> = {};
  const supabase = {
    from: vi.fn((table: string) => (supabaseImpl[table] ?? supabaseImpl['*'])),
  };

  return {
    isBanditsEnabledFn,
    hasNonDefaultVariantsFn,
    getVariantsForPhaseFn,
    supabase,
    setSupabaseImpl: (impl: Record<string, unknown>) => { supabaseImpl = impl; },
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../config/feature-flags.js', () => ({
  isBanditsEnabled: () => mocks.isBanditsEnabledFn(),
}));

vi.mock('../config/agent-variants.js', () => ({
  hasNonDefaultVariants: mocks.hasNonDefaultVariantsFn,
  getVariantsForPhase: mocks.getVariantsForPhaseFn,
  MAX_VARIANTS_PER_PHASE: 2,
}));

vi.mock('../services/supabase.js', () => ({
  supabase: mocks.supabase,
}));

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  BanditService,
  DEFAULT_VARIANT_ID,
  BANDIT_MIN_EVALUATION_COUNT,
  BANDIT_MIN_PHASES_WITH_DATA,
  BANDIT_EPSILON,
  aggregateBanditArmsFromEvaluationRows,
} from '../services/bandit.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PHASE = 'tech_infrastructure' as const;

const VARIANTS = [
  { variant_id: 'conservative', phase_id: PHASE, instruction_delta: 'Be conservative.', delta_type: 'append' as const },
  { variant_id: 'detailed', phase_id: PHASE, instruction_delta: 'Be detailed.', delta_type: 'append' as const },
];

/** Build a chainable supabase mock that returns the provided data/error. */
function makeQueryMock(data: unknown[], error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: undefined as unknown,
  };
  // Make the chain thenable so awaiting it resolves to { data, error }
  chain.select = vi.fn().mockReturnValue({
    ...chain,
    eq: vi.fn().mockReturnValue({
      ...chain,
      in: vi.fn().mockResolvedValue({ data, error }),
      gte: vi.fn().mockResolvedValue({ data, error }),
    }),
    gte: vi.fn().mockResolvedValue({ data, error }),
    in: vi.fn().mockResolvedValue({ data, error }),
  });
  return chain;
}

/** Rows for countPhasesWithSufficientData (≥ BANDIT_MIN_PHASES_WITH_DATA distinct phases). */
function phasesRows(count: number) {
  return Array.from({ length: count }, (_, i) => ({ phase_id: `phase_${i}` }));
}

/** Rows for fetchArmPerformance (all arms have sufficient runs). */
function armRows(variantIds: string[], runCount = BANDIT_MIN_EVALUATION_COUNT) {
  return variantIds.map(vid => ({
    phase_id: PHASE,
    variant_id: vid,
    run_count: runCount,
    avg_score: vid === DEFAULT_VARIANT_ID ? 0.6 : 0.7,
  }));
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('BanditService', () => {
  let svc: BanditService;

  beforeEach(() => {
    svc = new BanditService();
    mocks.isBanditsEnabledFn.mockReturnValue(false);
    mocks.hasNonDefaultVariantsFn.mockReturnValue(false);
    mocks.getVariantsForPhaseFn.mockReturnValue([]);
    mocks.supabase.from.mockReset();
  });

  // ── Gate 1: feature flag disabled ─────────────────────────────────────────

  it('returns default with BANDIT_DISABLED when bandits.enabled is false', async () => {
    mocks.isBanditsEnabledFn.mockReturnValue(false);
    const result = await svc.selectVariant(PHASE);
    expect(result).toEqual({ variant_id: DEFAULT_VARIANT_ID, gate_miss: 'BANDIT_DISABLED' });
    expect(mocks.supabase.from).not.toHaveBeenCalled();
  });

  // ── Gate 2: no non-default variants registered ────────────────────────────

  it('returns default with NO_NON_DEFAULT_VARIANTS when registry is empty', async () => {
    mocks.isBanditsEnabledFn.mockReturnValue(true);
    mocks.hasNonDefaultVariantsFn.mockReturnValue(false);
    const result = await svc.selectVariant(PHASE);
    expect(result).toEqual({ variant_id: DEFAULT_VARIANT_ID, gate_miss: 'NO_NON_DEFAULT_VARIANTS' });
    expect(mocks.supabase.from).not.toHaveBeenCalled();
  });

  // ── Gate 3: too many variants ─────────────────────────────────────────────

  it('returns default with TOO_MANY_VARIANTS when registered variants exceed MAX_VARIANTS_PER_PHASE', async () => {
    mocks.isBanditsEnabledFn.mockReturnValue(true);
    mocks.hasNonDefaultVariantsFn.mockReturnValue(true);
    // 3 variants > MAX_VARIANTS_PER_PHASE (2)
    mocks.getVariantsForPhaseFn.mockReturnValue([
      ...VARIANTS,
      { variant_id: 'extra', phase_id: PHASE, instruction_delta: '...', delta_type: 'append' },
    ]);
    const result = await svc.selectVariant(PHASE);
    expect(result).toEqual({ variant_id: DEFAULT_VARIANT_ID, gate_miss: 'TOO_MANY_VARIANTS' });
    expect(mocks.supabase.from).not.toHaveBeenCalled();
  });

  // ── Gate 4: insufficient distinct phases with data ────────────────────────

  it('returns default with INSUFFICIENT_PHASES_WITH_DATA when fewer than MIN_PHASES_WITH_DATA phases are ready', async () => {
    mocks.isBanditsEnabledFn.mockReturnValue(true);
    mocks.hasNonDefaultVariantsFn.mockReturnValue(true);
    mocks.getVariantsForPhaseFn.mockReturnValue(VARIANTS);

    // Only 2 distinct phases have sufficient data (< 3)
    const insufficientPhaseRows = phasesRows(BANDIT_MIN_PHASES_WITH_DATA - 1);

    mocks.supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({ data: insufficientPhaseRows, error: null }),
      }),
    });

    const result = await svc.selectVariant(PHASE);
    expect(result).toEqual({ variant_id: DEFAULT_VARIANT_ID, gate_miss: 'INSUFFICIENT_PHASES_WITH_DATA' });
  });

  // ── Gate 5: insufficient arm run counts ───────────────────────────────────

  it('returns default with INSUFFICIENT_ARM_RUNS when any arm has fewer than MIN_EVALUATION_COUNT runs', async () => {
    mocks.isBanditsEnabledFn.mockReturnValue(true);
    mocks.hasNonDefaultVariantsFn.mockReturnValue(true);
    mocks.getVariantsForPhaseFn.mockReturnValue(VARIANTS);

    const sufficientPhases = phasesRows(BANDIT_MIN_PHASES_WITH_DATA);
    // conservative arm has only 5 runs (< 10)
    const insufficientArms = armRows([DEFAULT_VARIANT_ID, 'detailed'], BANDIT_MIN_EVALUATION_COUNT).concat([
      { phase_id: PHASE, variant_id: 'conservative', run_count: 5, avg_score: 0.7 },
    ]);

    let callCount = 0;
    mocks.supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // countPhasesWithSufficientData call
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data: sufficientPhases, error: null }),
          }),
        };
      }
      // fetchArmPerformance call
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: insufficientArms, error: null }),
          }),
        }),
      };
    });

    const result = await svc.selectVariant(PHASE);
    expect(result).toEqual({ variant_id: DEFAULT_VARIANT_ID, gate_miss: 'INSUFFICIENT_ARM_RUNS' });
  });

  // ── DB error fallback ─────────────────────────────────────────────────────

  it('returns default with DB_ERROR on supabase throw', async () => {
    mocks.isBanditsEnabledFn.mockReturnValue(true);
    mocks.hasNonDefaultVariantsFn.mockReturnValue(true);
    mocks.getVariantsForPhaseFn.mockReturnValue(VARIANTS);

    mocks.supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockResolvedValue({ data: null, error: new Error('DB connection failed') }),
      }),
    });

    const result = await svc.selectVariant(PHASE);
    expect(result).toEqual({ variant_id: DEFAULT_VARIANT_ID, gate_miss: 'DB_ERROR' });
  });

  // ── ε-greedy: all gates pass ──────────────────────────────────────────────

  function setupAllGatesPass() {
    mocks.isBanditsEnabledFn.mockReturnValue(true);
    mocks.hasNonDefaultVariantsFn.mockReturnValue(true);
    mocks.getVariantsForPhaseFn.mockReturnValue(VARIANTS);

    const sufficientPhases = phasesRows(BANDIT_MIN_PHASES_WITH_DATA);
    const allVariantIds = [DEFAULT_VARIANT_ID, ...VARIANTS.map(v => v.variant_id)];
    const allArmRows = armRows(allVariantIds);
    // Give 'conservative' a higher score to test exploitation
    allArmRows.find(r => r.variant_id === 'conservative')!.avg_score = 0.85;

    let callCount = 0;
    mocks.supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data: sufficientPhases, error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: allArmRows, error: null }),
          }),
        }),
      };
    });
  }

  it('explores (random arm) when Math.random < epsilon', async () => {
    setupAllGatesPass();
    const spy = vi.spyOn(Math, 'random')
      .mockReturnValueOnce(BANDIT_EPSILON - 0.01)  // triggers exploration
      .mockReturnValueOnce(0);                      // picks index 0

    const result = await svc.selectVariant(PHASE);
    expect(result.explored).toBe(true);
    expect(result.gate_miss).toBeUndefined();

    spy.mockRestore();
  });

  it('exploits (highest avg_score arm) when Math.random >= epsilon', async () => {
    setupAllGatesPass();
    const spy = vi.spyOn(Math, 'random')
      .mockReturnValue(BANDIT_EPSILON + 0.01);  // above epsilon → exploitation

    const result = await svc.selectVariant(PHASE);
    expect(result.explored).toBe(false);
    expect(result.gate_miss).toBeUndefined();
    // 'conservative' has avg_score 0.85 — highest among all arms
    expect(result.variant_id).toBe('conservative');

    spy.mockRestore();
  });

  it('exploits default when it has the highest avg_score', async () => {
    setupAllGatesPass();
    // Override: give default the highest score
    const sufficientPhases = phasesRows(BANDIT_MIN_PHASES_WITH_DATA);
    const allVariantIds = [DEFAULT_VARIANT_ID, ...VARIANTS.map(v => v.variant_id)];
    const customArmRows = allVariantIds.map(vid => ({
      phase_id: PHASE,
      variant_id: vid,
      run_count: BANDIT_MIN_EVALUATION_COUNT,
      avg_score: vid === DEFAULT_VARIANT_ID ? 0.95 : 0.6,
    }));
    let callCount = 0;
    mocks.supabase.from.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockResolvedValue({ data: sufficientPhases, error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ data: customArmRows, error: null }),
          }),
        }),
      };
    });

    const spy = vi.spyOn(Math, 'random').mockReturnValue(1.0); // always exploit
    const result = await svc.selectVariant(PHASE);
    expect(result.variant_id).toBe(DEFAULT_VARIANT_ID);
    expect(result.explored).toBe(false);
    spy.mockRestore();
  });

  // ── recordArmResult ───────────────────────────────────────────────────────

  it('inserts a new arm row with count=1 and score=agentScore when no prior row exists', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: null });
    mocks.supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
      upsert: upsertFn,
    });

    await svc.recordArmResult(PHASE, 'conservative', 0.8);

    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ run_count: 1, avg_score: 0.8, variant_id: 'conservative', phase_id: PHASE }),
      expect.objectContaining({ onConflict: 'phase_id,variant_id' }),
    );
  });

  it('computes incremental rolling average correctly on update (prevCount=4, prevAvg=0.5, new=1.0 → avg=0.6)', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: null });
    mocks.supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { run_count: 4, avg_score: 0.5 },
              error: null,
            }),
          }),
        }),
      }),
      upsert: upsertFn,
    });

    await svc.recordArmResult(PHASE, 'conservative', 1.0);

    // newAvg = (0.5 * 4 + 1.0) / 5 = 3.0 / 5 = 0.6
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ run_count: 5, avg_score: 0.6 }),
      expect.any(Object),
    );
  });

  it('does not throw on recordArmResult DB error — fire-and-forget', async () => {
    mocks.supabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockRejectedValue(new Error('DB down')),
          }),
        }),
      }),
    });

    // Must not throw
    await expect(svc.recordArmResult(PHASE, 'conservative', 0.8)).resolves.toBeUndefined();
  });

  // ── Constants sanity ──────────────────────────────────────────────────────

  it('exports correct constants', () => {
    expect(BANDIT_MIN_EVALUATION_COUNT).toBe(10);
    expect(BANDIT_MIN_PHASES_WITH_DATA).toBe(3);
    expect(BANDIT_EPSILON).toBe(0.15);
    expect(DEFAULT_VARIANT_ID).toBe('default');
  });

  it('aggregates evaluation rows by phase+variant and defaults null variant id', () => {
    const out = aggregateBanditArmsFromEvaluationRows([
      {
        phase_id: PHASE,
        agent_variant_id: 'conservative',
        control_object: { agent_performance: { agent_score: 0.8 } },
      },
      {
        phase_id: PHASE,
        agent_variant_id: 'conservative',
        control_object: { agent_performance: { agent_score: 1.0 } },
      },
      {
        phase_id: PHASE,
        agent_variant_id: null,
        control_object: { agent_performance: { agent_score: 0.6 } },
      },
      {
        phase_id: PHASE,
        agent_variant_id: 'detailed',
        control_object: { agent_performance: {} },
      },
    ]);

    expect(out).toEqual(
      expect.arrayContaining([
        { phase_id: PHASE, variant_id: 'conservative', run_count: 2, avg_score: 0.9 },
        { phase_id: PHASE, variant_id: DEFAULT_VARIANT_ID, run_count: 1, avg_score: 0.6 },
      ]),
    );
    expect(out.some(r => r.variant_id === 'detailed')).toBe(false);
  });

  it('recomputes arm performance from evaluation_datasets', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: null });
    const deleteEqFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn(() => ({ eq: deleteEqFn }));
    const evalRows = [
      {
        phase_id: PHASE,
        agent_variant_id: 'conservative',
        control_object: { agent_performance: { agent_score: 0.8 } },
      },
      {
        phase_id: PHASE,
        agent_variant_id: 'conservative',
        control_object: { agent_performance: { agent_score: 1.0 } },
      },
      {
        phase_id: PHASE,
        agent_variant_id: null,
        control_object: { agent_performance: { agent_score: 0.6 } },
      },
    ];

    mocks.supabase.from.mockImplementation((table: string) => {
      if (table === 'evaluation_datasets') {
        return {
          select: vi.fn().mockResolvedValue({ data: evalRows, error: null }),
        };
      }
      return {
        delete: deleteFn,
        upsert: upsertFn,
      };
    });

    const result = await svc.recomputeArmPerformanceFromEvaluationDatasets();

    expect(result).toEqual({ phases_updated: 1, arms_upserted: 2, dataset_rows_seen: 3, dry_run: false });
    expect(deleteEqFn).toHaveBeenCalledWith('phase_id', PHASE);
    expect(upsertFn).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          phase_id: PHASE,
          variant_id: 'conservative',
          run_count: 2,
          avg_score: 0.9,
        }),
        expect.objectContaining({
          phase_id: PHASE,
          variant_id: DEFAULT_VARIANT_ID,
          run_count: 1,
          avg_score: 0.6,
        }),
      ]),
      expect.objectContaining({ onConflict: 'phase_id,variant_id' }),
    );
  });

  it('supports dry_run recompute without touching bandit_arm_performance writes', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    const evalRows = [
      {
        phase_id: PHASE,
        agent_variant_id: null,
        control_object: { agent_performance: { agent_score: 0.6 } },
      },
    ];

    mocks.supabase.from.mockImplementation((table: string) => {
      if (table === 'evaluation_datasets') {
        return {
          select: vi.fn().mockResolvedValue({ data: evalRows, error: null }),
        };
      }
      return {
        delete: deleteFn,
        upsert: upsertFn,
      };
    });

    const result = await svc.recomputeArmPerformanceFromEvaluationDatasets(undefined, { dryRun: true });
    expect(result).toEqual({ phases_updated: 1, arms_upserted: 1, dataset_rows_seen: 1, dry_run: true });
    expect(deleteFn).not.toHaveBeenCalled();
    expect(upsertFn).not.toHaveBeenCalled();
  });
});
