import { afterEach, describe, expect, it, vi } from 'vitest';
import { CdoFunnelArchitectAgent } from '../agents/sub/cdo/funnel-architect.js';
import { runCdoSubAgentOrchestrator } from '../services/orchestration/director-cdo-orchestrator.service.js';

describe('runCdoSubAgentOrchestrator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ordered CDO agents, QA block, and director bundle actions', async () => {
    const out = await runCdoSubAgentOrchestrator({
      auditId: 'audit-test',
      domainKey: 'ux_conversion',
      goals: ['Increase activation'],
      constraints: ['Limited engineering'],
    });
    expect(out.run_order).toEqual(['cdo.funnel_architect', 'cdo.friction', 'cdo.experimentation']);
    expect(out.director_bundle.actions.length).toBeGreaterThan(0);
    expect(out.director_bundle.actions[0]?.id).toContain('sub_agent:cdo');
    expect(out.qa_block.measurement.length).toBeGreaterThan(0);
  });

  it('uses deterministic fallback when sub-agent runtime fails', async () => {
    vi.spyOn(CdoFunnelArchitectAgent.prototype, 'runSubAgent').mockRejectedValue(new Error('force fallback'));
    const out = await runCdoSubAgentOrchestrator({
      auditId: 'audit-test',
      domainKey: 'ux_conversion',
      goals: ['Ship faster checkout'],
      constraints: ['No analytics yet'],
    });
    const funnel = out.agent_outputs['cdo.funnel_architect'] as { metadata?: { analysis_mode?: string } } | undefined;
    expect(funnel?.metadata?.analysis_mode).toBe('deterministic_fallback');
  });

  it('expands requested CDO subset with dependency-preserving run order', async () => {
    const out = await runCdoSubAgentOrchestrator({
      auditId: 'audit-test',
      domainKey: 'ux_conversion',
      goals: ['Increase activation'],
      constraints: ['Limited engineering'],
      requestedSubAgentIds: ['cdo.experimentation', 'cdo.funnel_architect'],
    });
    expect(out.selected_sub_agents).toEqual(['cdo.funnel_architect', 'cdo.friction', 'cdo.experimentation']);
    expect(out.run_order).toEqual(['cdo.funnel_architect', 'cdo.friction', 'cdo.experimentation']);
  });

  it('emits solution options for CDO action nodes', async () => {
    const out = await runCdoSubAgentOrchestrator({
      auditId: 'audit-test',
      domainKey: 'ux_conversion',
      goals: ['Improve trial-to-paid'],
      constraints: ['Keep scope small'],
    });
    const firstAction = out.director_bundle.actions[0];
    expect(firstAction?.solution_options?.length).toBeGreaterThanOrEqual(3);
  });
});
