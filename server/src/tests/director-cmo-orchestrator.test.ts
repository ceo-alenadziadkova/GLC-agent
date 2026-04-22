import { afterEach, describe, expect, it, vi } from 'vitest';
import { CmoAgent5ContentStrategy } from '../agents/sub/cmo/agent-5-content-strategy.js';
import { CmoAgent9Traffic } from '../agents/sub/cmo/agent-9-traffic.js';
import { runCmoSubAgentOrchestrator } from '../services/orchestration/director-cmo-orchestrator.service.js';
import { DIRECTOR_CMO_ORCHESTRATOR_POLICY } from '../config/director-cmo-orchestrator-policy.js';

describe('runCmoSubAgentOrchestrator', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns selected agents and qa block', async () => {
    const out = await runCmoSubAgentOrchestrator({
      goals: ['Increase qualified leads', 'Improve positioning'],
      constraints: ['Budget cap'],
      requestedSubAgentIds: ['cmo.agent_3_positioning', 'cmo.agent_9_traffic'],
    });
    expect(out.selected_sub_agents).toEqual(['cmo.agent_3_positioning', 'cmo.agent_9_traffic']);
    expect(out.qa_block.top_3_actions.length).toBeGreaterThan(0);
    expect(out.qa_block.measurement).toContain('pipeline_lead_volume');
    expect(out.director_bundle.actions.length).toBeGreaterThan(0);
    expect(out.director_bundle.actions[0]?.id).toContain('sub_agent:');
    const rows = Object.values(out.agent_outputs) as Array<
      { metadata?: { analysis_mode?: string; evidence_gap_reason?: string | null } } | undefined
    >;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row?.metadata?.analysis_mode).toMatch(/researched|deterministic_fallback/);
      if (row?.metadata?.analysis_mode === 'deterministic_fallback') {
        expect(row?.metadata?.evidence_gap_reason).toContain('deterministic fallback');
      }
    }
  });

  it('deterministic fallback meets §10/§14 minimum list sizes (ideas + hypotheses) per policy', async () => {
    vi.spyOn(CmoAgent5ContentStrategy.prototype, 'runSubAgent').mockRejectedValue(new Error('force fallback'));
    vi.spyOn(CmoAgent9Traffic.prototype, 'runSubAgent').mockRejectedValue(new Error('force fallback'));
    const out = await runCmoSubAgentOrchestrator({
      goals: ['Test goal'],
      constraints: ['Test constraint'],
      requestedSubAgentIds: ['cmo.agent_5_content_strategy', 'cmo.agent_9_traffic'],
    });
    const content = (
      out.agent_outputs['cmo.agent_5_content_strategy'] as { output: { ideas: unknown[] } } | undefined
    )?.output;
    const traffic = (
      out.agent_outputs['cmo.agent_9_traffic'] as { output: { hypotheses: unknown[] } } | undefined
    )?.output;
    expect(content?.ideas.length).toBe(DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.contentIdeasMinCount);
    expect(traffic?.hypotheses.length).toBe(
      DIRECTOR_CMO_ORCHESTRATOR_POLICY.deterministicDefaults.trafficHypothesesMinCount,
    );
  });
});
