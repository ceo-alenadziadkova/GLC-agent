import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CmoMarketOutputSchema } from '../../../schemas/sub-agents/cmo/market.js';

export class CmoAgent1Market extends DirectorSubAgentBase {
  readonly id = 'cmo.agent_1_market' as const;
  readonly directorDomain = 'marketing_utp' as const;
  readonly promptRef = 'server/prompts/sub-agents/cmo/agent-1-market.md';
  readonly outputSchema = CmoMarketOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cmo/agent-1-market');
  }
}
