import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CdoTrustCredibilityOutputSchema } from '../../../schemas/sub-agents/cdo/trust-credibility.js';

export class CdoTrustCredibilityAgent extends DirectorSubAgentBase {
  readonly id = 'cdo.trust_credibility' as const;
  readonly directorDomain = 'ux_conversion' as const;
  readonly promptRef = 'server/prompts/sub-agents/cdo/trust-credibility.md';
  readonly outputSchema = CdoTrustCredibilityOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cdo/trust-credibility');
  }
}
