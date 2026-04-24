import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { SeoContentIntentCoverageOutputSchema } from '../../../schemas/sub-agents/seo/content-intent-coverage.js';

export class SeoContentIntentCoverageAgent extends DirectorSubAgentBase {
  readonly id = 'seo.content_intent_coverage' as const;
  readonly directorDomain = 'seo_digital' as const;
  readonly promptRef = 'server/prompts/sub-agents/seo/content-intent-coverage.md';
  readonly outputSchema = SeoContentIntentCoverageOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/seo/content-intent-coverage');
  }
}
