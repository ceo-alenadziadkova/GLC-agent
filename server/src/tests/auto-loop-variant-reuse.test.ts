import { describe, expect, it, vi } from 'vitest';
import { createControlObjectV1 } from '../schemas/control-object.js';
import type { ControlObjectV1 } from '../schemas/control-object.js';
import type { DomainKey, DomainResult } from '../types/audit.js';
import type { BaseAgent } from '../agents/base.js';
import { PIPELINE_EVENT_TYPES } from '../config/pipeline-event-types.js';

const AUDIT_ID = 'audit-AL';
const PHASE = 2;
const DOMAIN_KEY: DomainKey = 'security_compliance';
const ORIGINAL_VARIANT_ID = 'variant-xyz';

const originalControlObject: ControlObjectV1 = createControlObjectV1(AUDIT_ID, DOMAIN_KEY);
originalControlObject.context.selected_variant_id = ORIGINAL_VARIANT_ID;
originalControlObject.confidence.overall = 80;
originalControlObject.cost_control = null;

const decideMock = vi.fn().mockReturnValue({
  hint: 'accept',
  reasoning: 'test accept',
  active_error_types: [],
});

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { data: { cost_usd: 0.5 } }, error: null }),
    })),
  },
}));

vi.mock('../services/decision-layer.js', () => ({
  decisionLayer: {
    decide: decideMock,
  },
}));

vi.mock('../services/remediation.js', () => ({
  applyAutoRemediation: vi.fn().mockResolvedValue(0),
}));

vi.mock('../services/benchmark-snapshot.js', () => ({
  attachBenchmarkReferenceToControlObject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/evaluation-dataset-writer.js', () => ({
  recordEvaluationDatasetIfEnabled: vi.fn().mockResolvedValue(undefined),
}));

const selectVariant = vi.fn();
vi.mock('../services/dynamic-adjustment.js', () => ({
  dynamicAdjustmentService: {
    generateAdjustments: vi.fn().mockReturnValue({
      // Phase number must be present so agent can read the patch from autoLoopAdjustments.
      adjustments: new Map([[2, 'auto-loop patch']]),
      matched_error_types: ['test_err_type'],
      unmatched_error_types: [],
    }),
  },
}));

vi.mock('../services/bandit.js', () => ({
  // Auto-loop service must not call bandit selection for reruns.
  DEFAULT_VARIANT_ID: 'default',
  banditService: { selectVariant },
}));

describe('Auto-loop: variant reuse semantics', { timeout: 30_000 }, () => {
  it('reuses original selected_variant_id for rerun', async () => {
    let observedSelectedVariantId: string | null = null;

    const emitEvent = vi.fn(async () => undefined);
    const recordBanditArmAsync = vi.fn();
    const attachPriorControlObjects = vi.fn(async (agent: unknown) => {
      observedSelectedVariantId = (agent as { selectedVariantId?: string | null }).selectedVariantId ?? null;
    });

    const { attemptAutoLoop } = await import('../services/pipeline/autoLoop/autoLoopService.js');

    class FakeAutoLoopAgent {
      public selectedVariantId: string | null = null;
      public variantDelta: unknown = null;
      public autoLoopAdjustments: Map<number, string> | null = null;
      public lastControlObject: ControlObjectV1 | null = null;
      public lastRawDomainResult: Record<string, unknown> | null = null;

      constructor(public auditId: string) {}

      async run(): Promise<DomainResult> {
        const rerun = structuredClone(originalControlObject) as ControlObjectV1;
        rerun.confidence.overall = 90;
        this.lastControlObject = rerun;
        this.lastRawDomainResult = { raw: true };
        return { score: 3, label: 'Moderate', summary: 'stub' } as unknown as DomainResult;
      }

      async saveDomainResult(_result: DomainResult): Promise<void> {
        return;
      }
    }

    const agentClassForPhase = vi.fn(() => FakeAutoLoopAgent as unknown as new (auditId: string) => BaseAgent);

    const ok = await attemptAutoLoop({
      auditId: AUDIT_ID,
      phase: PHASE,
      originalControlObject,
      activeErrorTypes: ['test_err_type'],
      disableAutoRemediate: false,
      agentClassForPhase,
      attachPriorControlObjects,
      recordBanditArmAsync,
      emitEvent,
    });

    expect(ok).toBe(true);
    expect(observedSelectedVariantId).toBe(ORIGINAL_VARIANT_ID);
    expect(selectVariant).not.toHaveBeenCalled();
    expect(attachPriorControlObjects).toHaveBeenCalledTimes(1);
  });

  it('emits refineRecommended when decision stays refine', async () => {
    decideMock.mockReturnValue({
      hint: 'refine',
      reasoning: 'force refine in test',
      active_error_types: ['test_err_type'],
    });

    const emitEvent = vi.fn(async () => undefined);
    const recordBanditArmAsync = vi.fn();
    const attachPriorControlObjects = vi.fn(async () => undefined);

    let saveDomainResultCalls = 0;

    const { attemptAutoLoop } = await import('../services/pipeline/autoLoop/autoLoopService.js');

    class FakeAutoLoopAgent {
      public selectedVariantId: string | null = null;
      public variantDelta: unknown = null;
      public autoLoopAdjustments: Map<number, string> | null = null;
      public lastControlObject: ControlObjectV1 | null = null;
      public lastRawDomainResult: Record<string, unknown> | null = null;

      constructor(public auditId: string) {}

      async run(): Promise<DomainResult> {
        // No confidence gain => auto-loop should break early and escalate via refineRecommended emission.
        const rerun = structuredClone(originalControlObject) as ControlObjectV1;
        rerun.confidence.overall = 80;
        this.lastControlObject = rerun;
        this.lastRawDomainResult = { raw: true };
        return { score: 3, label: 'Moderate', summary: 'stub' } as unknown as DomainResult;
      }

      async saveDomainResult(_result: DomainResult): Promise<void> {
        saveDomainResultCalls += 1;
      }
    }

    const agentClassForPhase = vi.fn(() => FakeAutoLoopAgent as unknown as new (auditId: string) => BaseAgent);

    const ok = await attemptAutoLoop({
      auditId: AUDIT_ID,
      phase: PHASE,
      originalControlObject,
      activeErrorTypes: ['test_err_type'],
      disableAutoRemediate: false,
      agentClassForPhase,
      attachPriorControlObjects,
      recordBanditArmAsync,
      emitEvent,
    });

    expect(ok).toBe(true);
    expect(saveDomainResultCalls).toBe(0);

    type EmitArgs = [number, string, string, { decision_hint?: string }];
    const refineCalls = (emitEvent.mock.calls as unknown as EmitArgs[]).filter(
      (c) => c[1] === PIPELINE_EVENT_TYPES.refineRecommended,
    );
    expect(refineCalls.length).toBe(1);
    const refineData = refineCalls[0][3];
    expect(refineData.decision_hint).toBe('refine');
  });
});

