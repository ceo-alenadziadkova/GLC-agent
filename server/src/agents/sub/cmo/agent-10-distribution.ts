import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CmoDistributionOutputSchema } from '../../../schemas/sub-agents/cmo/distribution.js';

export class CmoAgent10Distribution extends DirectorSubAgentBase {
  readonly id = 'cmo.agent_10_distribution' as const;
  readonly directorDomain = 'marketing_utp' as const;
  readonly promptRef = 'server/prompts/sub-agents/cmo/agent-10-distribution.md';
  readonly outputSchema = CmoDistributionOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cmo/agent-10-distribution');
  }
}
