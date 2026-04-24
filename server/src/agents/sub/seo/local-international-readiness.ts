import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { SeoLocalInternationalReadinessOutputSchema } from '../../../schemas/sub-agents/seo/local-international-readiness.js';

export class SeoLocalInternationalReadinessAgent extends DirectorSubAgentBase {
  readonly id = 'seo.local_international_readiness' as const;
  readonly directorDomain = 'seo_digital' as const;
  readonly promptRef = 'server/prompts/sub-agents/seo/local-international-readiness.md';
  readonly outputSchema = SeoLocalInternationalReadinessOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/seo/local-international-readiness');
  }
}
