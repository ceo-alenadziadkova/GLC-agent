import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PhaseAgentConstructor } from '../services/pipeline/orchestrator/phase-agent-registry.js';
import type { AuditExecutionPlan } from '../types/audit.js';

const runPhaseDomainExecutionMock = vi.hoisted(() => vi.fn());
const supabaseFromMock = vi.hoisted(() => vi.fn());

vi.mock('../services/pipeline/phaseRunner.js', () => ({
  runPhaseDomainExecution: runPhaseDomainExecutionMock,
}));

vi.mock('../services/orchestration/orchestration-pack-persist-run.service.js', () => ({
  maybeAutoPersistOrchestrationPackAfterStrategy: vi.fn().mockResolvedValue(undefined),
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

  it('retries a transient completed-domain read before running the isolated phase', async () => {
    const maybeSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'statement timeout', code: '57014' } })
      .mockResolvedValueOnce({ data: { status: 'running' }, error: null });
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
    });

    expect(maybeSingle).toHaveBeenCalledTimes(2);
    expect(runPhaseDomainExecutionMock).toHaveBeenCalledOnce();
  });

  it('throws on permanent completed-domain read errors instead of rerunning Claude', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'permission denied for table audit_domains', code: '42501' },
    });
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.maybeSingle = maybeSingle;
    chain.update = vi.fn(() => chain);
    supabaseFromMock.mockImplementation(() => chain);

    await expect(
      runSinglePhaseWithLifecycle({
        mode: 'isolated',
        auditId: 'audit-1',
        phase: 1,
        agentClass: class MockAgent {} as unknown as PhaseAgentConstructor,
        emitEvent: vi.fn().mockResolvedValue(undefined),
        assertNotCancelled: async () => {},
        updateAuditIfNotCancelled: async () => true,
        attachPriorControlObjects: async () => {},
        publishControlObjectGovernance: async () => {},
      }),
    ).rejects.toThrow('Failed to read latest domain status for tech_infrastructure');

    expect(maybeSingle).toHaveBeenCalledOnce();
    expect(runPhaseDomainExecutionMock).not.toHaveBeenCalled();
  });

  it('runs the sequential review-gate hook before reopening review and emitting reviewNeeded', async () => {
    const chain: Record<string, unknown> = {};
    chain.update = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.select = vi.fn(async () => ({ data: [{ id: 'review-1' }], error: null }));
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

    const eventOrder: string[] = [];
    const emitEvent = vi.fn(async (_phase: number, eventType: string) => {
      eventOrder.push(eventType);
    });
    const beforeSequentialReviewGate = vi.fn(async () => {
      eventOrder.push('strategy_quality_gate');
    });
    const plan: AuditExecutionPlan = {
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

    await runSinglePhaseWithLifecycle({
      mode: 'sequential',
      auditId: 'audit-1',
      phase: 7,
      agentClass: class MockAgent {} as unknown as PhaseAgentConstructor,
      emitEvent,
      assertNotCancelled: async () => {},
      updateAuditIfNotCancelled: async () => true,
      attachPriorControlObjects: async () => {},
      publishControlObjectGovernance: async () => {},
      getExecutionPlan: async () => plan,
      beforeSequentialReviewGate,
    });

    expect(beforeSequentialReviewGate).toHaveBeenCalledWith(7);
    expect(eventOrder.indexOf('strategy_quality_gate')).toBeLessThan(eventOrder.indexOf('review_needed'));
  });
});
