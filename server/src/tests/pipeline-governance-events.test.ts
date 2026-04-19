/**
 * Verifies pipeline governance emissions with fully mocked Supabase and agents:
 * - `control_object` for each domain phase (1–6) on a full 0–7 run
 * - `refine_recommended` when Decision Layer returns refine (weak control object)
 * - Phase completes and saveDomainResult runs when DecisionLayer.decide throws once
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

type MakeGovAgentClassFn = (phase: number) => new (auditId: string) => {
  lastControlObject: Record<string, unknown> | null;
  run(): Promise<unknown>;
  saveDomainResult(r: unknown): Promise<void>;
};

function govAgentClass(phase: number) {
  const mk = (globalThis as unknown as { __makeGovAgentClass: MakeGovAgentClassFn }).__makeGovAgentClass;
  return mk(phase);
}

const {
  GOV_AUDIT_ID,
  mockAssertBriefReady,
  mockAgentRun,
  mockAgentSaveDomainResult,
  getInsertCalls,
  setProductMode,
  clearCalls,
  setCoImpl,
  resetCoImplDefault,
} = vi.hoisted(() => {
  const GOV_AUDIT_ID = 'gov-audit-001';
  const updateCalls: Array<{ table: string; payload: Record<string, unknown>; filters: Record<string, string> }> = [];
  const insertCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];

  let productMode = 'full';
  const setProductMode = (m: string) => {
    productMode = m;
  };
  const getInsertCalls = () => insertCalls;
  const clearCalls = () => {
    updateCalls.length = 0;
    insertCalls.length = 0;
  };

  type CoFn = (phase: number, auditId: string) => Record<string, unknown> | null;
  let coImpl: CoFn = () => null;
  const setCoImpl = (f: CoFn) => {
    coImpl = f;
  };
  const resetCoImplDefault = () => {
    coImpl = () => null;
  };

  const mockAssertBriefReady = vi.fn().mockResolvedValue(undefined);
  const mockAgentRun = vi.fn().mockResolvedValue({
    score: 3,
    label: 'Moderate',
    summary: 'Test summary',
    strengths: [],
    weaknesses: [],
    issues: [],
    quick_wins: [],
    recommendations: [],
    unknown_items: [],
  });
  const mockAgentSaveDomainResult = vi.fn().mockResolvedValue(undefined);

  const makeChain = (table: string) => {
    const filters: Record<string, string> = {};
    let updatePayload: Record<string, unknown> = {};

    const chain: Record<string, unknown> = {};
    chain.eq = vi.fn((col: string, val: string) => {
      filters[col] = val;
      return chain;
    });
    chain.select = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    chain.limit = vi.fn().mockReturnValue(chain);
    chain.in = vi.fn().mockReturnValue(chain);
    chain.single = vi.fn(() => {
      if (table === 'audits') {
        return Promise.resolve({
          data: { product_mode: productMode },
          error: null,
        });
      }
      if (table === 'review_points') {
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
      }
      return Promise.resolve({ data: null, error: null });
    });
    chain.update = vi.fn((payload: Record<string, unknown>) => {
      updatePayload = payload;
      const capturedFilters = { ...filters };
      updateCalls.push({ table, payload, filters: capturedFilters });
      const afterUpdate: Record<string, unknown> = {};
      afterUpdate.eq = vi.fn((col: string, val: string) => {
        capturedFilters[col] = val;
        updateCalls[updateCalls.length - 1].filters = { ...capturedFilters };
        return afterUpdate;
      });
      return afterUpdate;
    });
    chain.insert = vi.fn((payload: Record<string, unknown>) => {
      insertCalls.push({ table, payload });
      return Promise.resolve({ error: null });
    });
    chain.upsert = vi.fn(() => Promise.resolve({ error: null }));

    return chain;
  };

  const mockFrom = vi.fn((table: string) => makeChain(table));

  (globalThis as Record<string, unknown>).__govPipelineMockFrom = mockFrom;
  (globalThis as Record<string, unknown>).__govMockAssertBriefReady = mockAssertBriefReady;
  (globalThis as Record<string, unknown>).__govMockAgentRun = mockAgentRun;
  (globalThis as Record<string, unknown>).__govMockAgentSaveDomainResult = mockAgentSaveDomainResult;
  (globalThis as Record<string, unknown>).__govCoImplGetter = () => coImpl;

  function makeGovAgentClass(phase: number) {
    return class GovMockAgent {
      lastControlObject: Record<string, unknown> | null = null;

      async run() {
        const holder = (globalThis as Record<string, unknown>).__govCoImplGetter as () => CoFn;
        this.lastControlObject = holder()(phase, GOV_AUDIT_ID);
        return ((globalThis as Record<string, unknown>).__govMockAgentRun as () => Promise<unknown>)();
      }

      async saveDomainResult(r: unknown) {
        return ((globalThis as Record<string, unknown>).__govMockAgentSaveDomainResult as (x: unknown) => Promise<void>)(
          r,
        );
      }
    };
  }

  (globalThis as Record<string, unknown>).__makeGovAgentClass = makeGovAgentClass;

  return {
    GOV_AUDIT_ID,
    mockAssertBriefReady,
    mockAgentRun,
    mockAgentSaveDomainResult,
    getInsertCalls,
    setProductMode,
    clearCalls,
    setCoImpl,
    resetCoImplDefault,
  };
});

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__govPipelineMockFrom },
}));

vi.mock('../services/brief-validator.js', () => ({
  assertBriefReady: (globalThis as Record<string, unknown>).__govMockAssertBriefReady,
  saveBriefResponses: vi.fn(),
  validateBriefResponses: vi.fn(),
}));

vi.mock('../services/notifications.js', () => ({
  emitStructuredNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/observability-context.js', () => ({
  getContext: vi.fn(() => ({ traceId: 'trace-gov', operationId: 'op-gov' })),
  updateContext: vi.fn(),
}));

vi.mock('../agents/recon.js', () => ({ ReconAgent: govAgentClass(0) }));
vi.mock('../agents/tech.js', () => ({ TechAgent: govAgentClass(1) }));
vi.mock('../agents/security.js', () => ({ SecurityAgent: govAgentClass(2) }));
vi.mock('../agents/seo.js', () => ({ SeoAgent: govAgentClass(3) }));
vi.mock('../agents/ux.js', () => ({ UxAgent: govAgentClass(4) }));
vi.mock('../agents/marketing.js', () => ({ MarketingAgent: govAgentClass(5) }));
vi.mock('../agents/automation.js', () => ({ AutomationAgent: govAgentClass(6) }));
vi.mock('../agents/strategy.js', () => ({ StrategyAgent: govAgentClass(7) }));

vi.mock('../services/consistency-checker.js', () => ({
  consistencyChecker: { run: vi.fn().mockResolvedValue({ passed: true, flags: [] }) },
}));

import { PipelineOrchestrator } from '../services/pipeline.js';
import { decisionLayer } from '../services/decision-layer.js';
import { createControlObjectV1, type ControlObjectV1 } from '../schemas/control-object.js';
import { PHASE_DOMAIN_MAP } from '../types/audit.js';

function getPipelineInserts() {
  return getInsertCalls().filter(c => c.table === 'pipeline_events');
}

describe('PipelineOrchestrator governance events', () => {
  beforeEach(() => {
    clearCalls();
    setProductMode('full');
    resetCoImplDefault();
    setCoImpl((phase, auditId) => {
      const dk = PHASE_DOMAIN_MAP[phase];
      if (dk === 'recon' || dk === 'strategy') return null;
      return createControlObjectV1(auditId, dk) as unknown as Record<string, unknown>;
    });
    (mockAssertBriefReady as Mock).mockReset().mockResolvedValue(undefined);
    (mockAgentRun as Mock).mockReset().mockResolvedValue({
      score: 3,
      label: 'Moderate',
      summary: 'Test summary',
      strengths: [],
      weaknesses: [],
      issues: [],
      quick_wins: [],
      recommendations: [],
      unknown_items: [],
    });
    (mockAgentSaveDomainResult as Mock).mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits control_object for phases 1–6 on full 0–7 run (not recon/strategy)', async () => {
    const orch = new PipelineOrchestrator(GOV_AUDIT_ID);
    for (let p = 0; p <= 7; p += 1) {
      await orch.startPhase(p);
    }

    const controlRows = getPipelineInserts().filter(i => i.payload.event_type === 'control_object');
    const phases = controlRows.map(r => r.payload.phase).sort((a, b) => Number(a) - Number(b));
    expect(phases).toEqual([1, 2, 3, 4, 5, 6]);
    expect(controlRows).toHaveLength(6);

    for (const row of controlRows) {
      const data = row.payload.data as Record<string, unknown>;
      expect(data.control_object).toBeDefined();
      const co = data.control_object as ControlObjectV1;
      expect(co.decision_hint).toMatch(/accept|accept_with_warnings|refine/);
    }
  });

  it('emits refine_recommended when control object yields refine (low overall confidence)', async () => {
    setCoImpl((phase, auditId) => {
      const dk = PHASE_DOMAIN_MAP[phase];
      if (dk === 'recon' || dk === 'strategy') return null;
      const co = createControlObjectV1(auditId, dk);
      co.confidence.overall = 50;
      co.confidence.factual = 50;
      return co as unknown as Record<string, unknown>;
    });

    const orch = new PipelineOrchestrator(GOV_AUDIT_ID);
    await orch.startPhase(1);

    const refineRows = getPipelineInserts().filter(i => i.payload.event_type === 'refine_recommended');
    expect(refineRows.length).toBeGreaterThanOrEqual(1);
    const data = refineRows[0].payload.data as Record<string, unknown>;
    expect(data.decision_hint).toBe('refine');
    expect(data.control_object).toBeDefined();
  });

  it('completes domain phase and saves result when DecisionLayer.decide throws once', async () => {
    const decideSpy = vi.spyOn(decisionLayer, 'decide').mockImplementationOnce(() => {
      throw new Error('mock decision layer failure');
    });

    const orch = new PipelineOrchestrator(GOV_AUDIT_ID);
    await expect(orch.startPhase(1)).resolves.toBe('completed');

    expect(mockAgentSaveDomainResult).toHaveBeenCalled();
    const controlRows = getPipelineInserts().filter(i => i.payload.event_type === 'control_object');
    expect(controlRows.length).toBeGreaterThanOrEqual(1);
    const co = (controlRows[0].payload.data as Record<string, unknown>).control_object as ControlObjectV1;
    expect(co.decision_hint).toBe('accept');

    decideSpy.mockRestore();
  });

  it('keeps strategy completion when upstream quality is mixed (accept + accept_with_warnings)', async () => {
    setCoImpl((phase, auditId) => {
      const dk = PHASE_DOMAIN_MAP[phase];
      if (dk === 'recon' || dk === 'strategy') return null;
      const co = createControlObjectV1(auditId, dk);
      co.counts.fact = 10;
      co.counts.total_claims = 12;
      co.counts.statuses.likely_hallucination = 1;
      co.errors.structural = [];

      // Phase 5 (marketing) is intentionally lower quality but still warning-acceptable.
      if (phase === 5) {
        co.confidence.overall = 72;
        co.confidence.factual = 70;
        co.confidence.strategic = 71;
        co.confidence.consistency = 74;
        co.errors.fixable = ['marketing_roi_figure_speculative'];
      } else {
        co.confidence.overall = 90;
        co.confidence.factual = 90;
        co.confidence.strategic = 88;
        co.confidence.consistency = 92;
      }
      return co as unknown as Record<string, unknown>;
    });

    const orch = new PipelineOrchestrator(GOV_AUDIT_ID);
    for (let p = 0; p <= 7; p += 1) {
      await orch.startPhase(p);
    }

    const events = getPipelineInserts();
    const controlRows = events.filter(i => i.payload.event_type === 'control_object');
    const phase5Control = controlRows.find(r => r.payload.phase === 5);
    expect(phase5Control).toBeDefined();
    const phase5Co = (phase5Control!.payload.data as Record<string, unknown>).control_object as ControlObjectV1;
    expect(phase5Co.decision_hint).toBe('accept_with_warnings');

    const strategyCompleted = events.find(
      e => e.payload.event_type === 'completed' && e.payload.phase === 7,
    );
    expect(strategyCompleted).toBeDefined();
    expect((strategyCompleted!.payload.message as string).toLowerCase()).toContain('phase 7');
  });

  it('is deterministic for final gate behavior across identical runs', async () => {
    const stableCo = (phase: number, auditId: string): Record<string, unknown> | null => {
      const dk = PHASE_DOMAIN_MAP[phase];
      if (dk === 'recon' || dk === 'strategy') return null;
      const co = createControlObjectV1(auditId, dk);
      co.counts.fact = 10;
      co.counts.total_claims = 12;
      co.errors.structural = [];
      co.counts.statuses.likely_hallucination = 1;
      co.counts.statuses.risky_promise = 0;

      if (phase === 5) {
        co.confidence.overall = 72;
        co.confidence.factual = 71;
        co.confidence.strategic = 70;
        co.confidence.consistency = 74;
        co.errors.fixable = ['marketing_roi_figure_speculative'];
      } else {
        co.confidence.overall = 90;
        co.confidence.factual = 90;
        co.confidence.strategic = 89;
        co.confidence.consistency = 91;
      }
      return co as unknown as Record<string, unknown>;
    };

    const runOnce = async () => {
      clearCalls();
      setCoImpl(stableCo);
      const orch = new PipelineOrchestrator(GOV_AUDIT_ID);
      for (let p = 0; p <= 7; p += 1) {
        await orch.startPhase(p);
      }
      const events = getPipelineInserts();
      const controlByPhase = events
        .filter(i => i.payload.event_type === 'control_object')
        .map(i => {
          const phase = Number(i.payload.phase);
          const data = i.payload.data as Record<string, unknown>;
          const co = data.control_object as ControlObjectV1;
          return { phase, hint: co.decision_hint };
        })
        .sort((a, b) => a.phase - b.phase);

      const strategyCompleted = events.some(
        e => e.payload.event_type === 'completed' && e.payload.phase === 7,
      );
      return { controlByPhase, strategyCompleted };
    };

    const first = await runOnce();
    const second = await runOnce();

    expect(first.controlByPhase).toEqual(second.controlByPhase);
    expect(first.strategyCompleted).toBe(true);
    expect(second.strategyCompleted).toBe(true);
  });

});
