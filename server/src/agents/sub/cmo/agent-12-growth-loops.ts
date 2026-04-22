import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CmoGrowthLoopsOutputSchema } from '../../../schemas/sub-agents/cmo/growth-loops.js';

export class CmoAgent12GrowthLoops extends DirectorSubAgentBase {
  readonly id = 'cmo.agent_12_growth_loops' as const;
  readonly directorDomain = 'marketing_utp' as const;
  readonly promptRef = 'server/prompts/sub-agents/cmo/agent-12-growth-loops.md';
  readonly outputSchema = CmoGrowthLoopsOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cmo/agent-12-growth-loops');
  }
}
