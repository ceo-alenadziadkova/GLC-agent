import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { SeoAuthorityTrustOutputSchema } from '../../../schemas/sub-agents/seo/authority-trust.js';

export class SeoAuthorityTrustAgent extends DirectorSubAgentBase {
  readonly id = 'seo.authority_trust' as const;
  readonly directorDomain = 'seo_digital' as const;
  readonly promptRef = 'server/prompts/sub-agents/seo/authority-trust.md';
  readonly outputSchema = SeoAuthorityTrustOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/seo/authority-trust');
  }
}
