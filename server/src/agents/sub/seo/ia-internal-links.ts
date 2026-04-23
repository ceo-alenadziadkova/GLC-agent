import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { SeoIaInternalLinksOutputSchema } from '../../../schemas/sub-agents/seo/ia-internal-links.js';

export class SeoIaInternalLinksAgent extends DirectorSubAgentBase {
  readonly id = 'seo.ia_internal_links' as const;
  readonly directorDomain = 'seo_digital' as const;
  readonly promptRef = 'server/prompts/sub-agents/seo/ia-internal-links.md';
  readonly outputSchema = SeoIaInternalLinksOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/seo/ia-internal-links');
  }
}
