import { afterEach, describe, expect, it, vi } from 'vitest';
import { CaoProcessMapAgent } from '../agents/sub/cao/process-map.js';
import { runCaoSubAgentOrchestrator } from '../services/orchestration/director-cao-orchestrator.service.js';

describe('runCaoSubAgentOrchestrator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns ordered CAO agents, QA block, and director bundle actions', async () => {
    const out = await runCaoSubAgentOrchestrator({
      auditId: 'audit-test',
      domainKey: 'automation_processes',
      goals: ['Reduce manual handoffs'],
      constraints: ['Limited change windows'],
    });
    expect(out.run_order).toEqual(['cao.process_map', 'cao.automation_candidates', 'cao.throughput']);
    expect(out.director_bundle.actions.length).toBeGreaterThan(0);
    expect(out.director_bundle.actions[0]?.id).toContain('sub_agent:cao');
    expect(out.qa_block.measurement.length).toBeGreaterThan(0);
  });

  it('uses deterministic fallback when sub-agent runtime fails', async () => {
    vi.spyOn(CaoProcessMapAgent.prototype, 'runSubAgent').mockRejectedValue(new Error('force fallback'));
    const out = await runCaoSubAgentOrchestrator({
      auditId: 'audit-test',
      domainKey: 'automation_processes',
      goals: ['Streamline approvals'],
      constraints: ['SOP-heavy org'],
    });
    const row = out.agent_outputs['cao.process_map'] as { metadata?: { analysis_mode?: string } } | undefined;
    expect(row?.metadata?.analysis_mode).toBe('deterministic_fallback');
  });

  it('expands requested CAO subset with dependency-preserving run order', async () => {
    const out = await runCaoSubAgentOrchestrator({
      auditId: 'audit-test',
      domainKey: 'automation_processes',
      goals: ['Reduce manual steps'],
      constraints: ['No headcount increase'],
      requestedSubAgentIds: ['cao.throughput', 'cao.process_map'],
    });
    expect(out.selected_sub_agents).toEqual([
      'cao.process_map',
      'cao.automation_candidates',
      'cao.throughput',
    ]);
    expect(out.run_order).toEqual([
      'cao.process_map',
      'cao.automation_candidates',
      'cao.throughput',
    ]);
  });
});
