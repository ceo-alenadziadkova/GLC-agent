import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PhaseAgentConstructor } from '../services/pipeline/orchestrator/phase-agent-registry.js';

const runPhaseDomainExecutionMock = vi.hoisted(() => vi.fn());
const supabaseFromMock = vi.hoisted(() => vi.fn());

vi.mock('../services/pipeline/phaseRunner.js', () => ({
  runPhaseDomainExecution: runPhaseDomainExecutionMock,
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: supabaseFromMock,
  },
}));

import { runSinglePhaseWithLifecycle } from '../services/pipeline/orchestrator/run-single-phase.js';

describe('runSinglePhaseWithLifecycle (isolated) skip completed domain', () => {
  beforeEach(() => {
    runPhaseDomainExecutionMock.mockReset();
    supabaseFromMock.mockReset();
  });

  it('skips isolated phase when latest audit_domains row is already completed', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'completed' }, error: null });
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.maybeSingle = maybeSingle;
    chain.update = vi.fn(() => chain);
    supabaseFromMock.mockImplementation(() => chain);

    const emitEvent = vi.fn().mockResolvedValue(undefined);

    const result = await runSinglePhaseWithLifecycle({
      mode: 'isolated',
      auditId: 'audit-1',
      phase: 1,
      agentClass: class MockAgent {} as unknown as PhaseAgentConstructor,
      emitEvent,
      assertNotCancelled: async () => {},
      updateAuditIfNotCancelled: async () => true,
      attachPriorControlObjects: async () => {},
      publishControlObjectGovernance: async () => {},
    });

    expect(result).toBeUndefined();
    expect(supabaseFromMock).toHaveBeenCalledWith('audit_domains');
    expect(runPhaseDomainExecutionMock).not.toHaveBeenCalled();
    expect(emitEvent).toHaveBeenCalledWith(
      1,
      'log',
      expect.stringContaining('already completed'),
      expect.objectContaining({ skipped: true, reason: 'already_completed' }),
    );
  });

  it('runs isolated phase when bypass flag is set even if latest row is completed', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'completed' }, error: null });
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.maybeSingle = maybeSingle;
    chain.update = vi.fn(() => chain);
    supabaseFromMock.mockImplementation(() => chain);

    runPhaseDomainExecutionMock.mockResolvedValue({
      score: 4,
      label: 'Good',
      summary: 'ok',
      strengths: [],
      weaknesses: [],
      issues: [],
      quick_wins: [],
      recommendations: [],
      unknown_items: [],
    });

    await runSinglePhaseWithLifecycle({
      mode: 'isolated',
      auditId: 'audit-1',
      phase: 1,
      agentClass: class MockAgent {} as unknown as PhaseAgentConstructor,
      emitEvent: vi.fn().mockResolvedValue(undefined),
      assertNotCancelled: async () => {},
      updateAuditIfNotCancelled: async () => true,
      attachPriorControlObjects: async () => {},
      publishControlObjectGovernance: async () => {},
      isolationConsultantRetryBypassAlreadyCompleted: true,
    });

    expect(runPhaseDomainExecutionMock).toHaveBeenCalledOnce();
  });
});
