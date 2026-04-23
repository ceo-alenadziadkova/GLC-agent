import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { SeoSerpCtrLeversOutputSchema } from '../../../schemas/sub-agents/seo/serp-ctr-levers.js';

export class SeoSerpCtrLeversAgent extends DirectorSubAgentBase {
  readonly id = 'seo.serp_ctr_levers' as const;
  readonly directorDomain = 'seo_digital' as const;
  readonly promptRef = 'server/prompts/sub-agents/seo/serp-ctr-levers.md';
  readonly outputSchema = SeoSerpCtrLeversOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/seo/serp-ctr-levers');
  }
}
