import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CmoFounderBrandOutputSchema } from '../../../schemas/sub-agents/cmo/founder-brand.js';

export class CmoAgent11FounderBrand extends DirectorSubAgentBase {
  readonly id = 'cmo.agent_11_founder_brand' as const;
  readonly directorDomain = 'marketing_utp' as const;
  readonly promptRef = 'server/prompts/sub-agents/cmo/agent-11-founder-brand.md';
  readonly outputSchema = CmoFounderBrandOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cmo/agent-11-founder-brand');
  }
}
