/**
 * Ensures post-analytic strategy quality gate runs only after strategy phase completes.
 * A silent sequential cancel must not emit a misleading quality_gate row.
 */
import { describe, expect, it, vi } from 'vitest';

const { runStrategyQualityGateMock, runAutoWingQualityGateMock } = vi.hoisted(() => ({
  runStrategyQualityGateMock: vi.fn().mockResolvedValue(undefined),
  runAutoWingQualityGateMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { current_phase: 5, status: 'analytic' },
        error: null,
      }),
    })),
  },
}));

vi.mock('../services/pipeline/reviewGateCoordinator.js', () => ({
  runAutoWingQualityGateAndMaybeReviewGate: runAutoWingQualityGateMock,
  runStrategyQualityGate: runStrategyQualityGateMock,
}));

import type { AuditExecutionPlan } from '../types/audit.js';
import { runPipelineOrchestratorBlock } from '../services/pipeline/orchestrator/run-block.js';
import { PipelineCancelledError } from '../services/pipeline/orchestrator/pipeline-cancelled.error.js';

const FULL_PLAN: AuditExecutionPlan = {
  selected_domains: [
    'tech_infrastructure',
    'security_compliance',
    'seo_digital',
    'ux_conversion',
    'marketing_utp',
    'automation_processes',
  ],
  depth: 'deep',
  source: 'system_default',
  coverage_package: 'complete',
  include_strategy: true,
};

describe('runPipelineOrchestratorBlock — strategy quality gate', () => {
  it('does not call runStrategyQualityGate when strategy phase returns cancelled', async () => {
    runStrategyQualityGateMock.mockClear();

    await runPipelineOrchestratorBlock({
      auditId: 'audit-block-001',
      loadExecutionPlan: async () => FULL_PLAN,
      updateAuditIfNotCancelled: async () => true,
      runParallelBlock: async () => [],
      startPhaseSequential: async () => 'cancelled',
      emitEvent: async () => {},
      cancelledErrorFactory: () => new PipelineCancelledError(),
    });

    expect(runStrategyQualityGateMock).not.toHaveBeenCalled();
  });

  it('calls runStrategyQualityGate after strategy phase completes', async () => {
    runStrategyQualityGateMock.mockClear();

    await runPipelineOrchestratorBlock({
      auditId: 'audit-block-002',
      loadExecutionPlan: async () => FULL_PLAN,
      updateAuditIfNotCancelled: async () => true,
      runParallelBlock: async () => [],
      startPhaseSequential: async (_phase, options) => {
        await options?.beforeReviewGate?.(7);
        return 'completed';
      },
      emitEvent: async () => {},
      cancelledErrorFactory: () => new PipelineCancelledError(),
    });

    expect(runStrategyQualityGateMock).toHaveBeenCalledOnce();
    expect(runStrategyQualityGateMock).toHaveBeenCalledWith({
      auditId: 'audit-block-002',
      afterPhase: 7,
      phasesToCheck: [5, 6, 7],
    });
  });
});
