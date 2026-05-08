import { describe, expect, it, vi } from 'vitest';

const { state, runAutoWingQualityGateMock } = vi.hoisted(() => ({
  state: {
    currentPhase: 0,
    runCoalitionBlock: vi.fn().mockResolvedValue(undefined),
    runParallelBlock: vi.fn().mockResolvedValue([]),
  },
  runAutoWingQualityGateMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { current_phase: state.currentPhase, status: 'review' },
        error: null,
      }),
    })),
  },
}));

vi.mock('../services/pipeline/reviewGateCoordinator.js', () => ({
  runAutoWingQualityGateAndMaybeReviewGate: runAutoWingQualityGateMock,
  runStrategyQualityGate: vi.fn().mockResolvedValue(undefined),
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

describe('runPipelineOrchestratorBlock — coalition shadow hook', () => {
  it('runs coalition block before legacy auto wing immediately after recon', async () => {
    state.currentPhase = 0;
    state.runCoalitionBlock.mockClear();
    state.runParallelBlock.mockClear();

    await runPipelineOrchestratorBlock({
      auditId: 'audit-coalition-001',
      loadExecutionPlan: async () => FULL_PLAN,
      updateAuditIfNotCancelled: async () => true,
      runParallelBlock: state.runParallelBlock,
      runCoalitionBlock: state.runCoalitionBlock,
      startPhaseSequential: async () => 'completed',
      emitEvent: async () => {},
      cancelledErrorFactory: () => new PipelineCancelledError(),
    });

    expect(state.runCoalitionBlock).toHaveBeenCalledOnce();
    expect(state.runParallelBlock).toHaveBeenCalledOnce();
    expect(state.runCoalitionBlock.mock.invocationCallOrder[0]).toBeLessThan(
      state.runParallelBlock.mock.invocationCallOrder[0],
    );
  });

  it('does not run coalition block after the pipeline has advanced beyond recon', async () => {
    state.currentPhase = 4;
    state.runCoalitionBlock.mockClear();

    await runPipelineOrchestratorBlock({
      auditId: 'audit-coalition-002',
      loadExecutionPlan: async () => FULL_PLAN,
      updateAuditIfNotCancelled: async () => true,
      runParallelBlock: state.runParallelBlock,
      runCoalitionBlock: state.runCoalitionBlock,
      startPhaseSequential: async () => 'completed',
      emitEvent: async () => {},
      cancelledErrorFactory: () => new PipelineCancelledError(),
    });

    expect(state.runCoalitionBlock).not.toHaveBeenCalled();
  });
});

