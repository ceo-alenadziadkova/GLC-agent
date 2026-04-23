import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { SeoTechnicalIndexabilityOutputSchema } from '../../../schemas/sub-agents/seo/technical-indexability.js';

export class SeoTechnicalIndexabilityAgent extends DirectorSubAgentBase {
  readonly id = 'seo.technical_indexability' as const;
  readonly directorDomain = 'seo_digital' as const;
  readonly promptRef = 'server/prompts/sub-agents/seo/technical-indexability.md';
  readonly outputSchema = SeoTechnicalIndexabilityOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/seo/technical-indexability');
  }
}
