import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CtoRoadmapTradeoffsOutputSchema } from '../../../schemas/sub-agents/cto/roadmap-tradeoffs.js';

export class CtoRoadmapTradeoffsAgent extends DirectorSubAgentBase {
  readonly id = 'cto.roadmap_tradeoffs' as const;
  readonly directorDomain = 'tech_infrastructure' as const;
  readonly promptRef = 'server/prompts/sub-agents/cto/roadmap-tradeoffs.md';
  readonly outputSchema = CtoRoadmapTradeoffsOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cto/roadmap-tradeoffs');
  }
}
