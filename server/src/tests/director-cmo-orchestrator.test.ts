import { describe, expect, it } from 'vitest';
import { runCmoSubAgentOrchestrator } from '../services/orchestration/director-cmo-orchestrator.service.js';

describe('runCmoSubAgentOrchestrator', () => {
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
});
