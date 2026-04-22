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
  });
});
