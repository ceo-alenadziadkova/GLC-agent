import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { SeoVisibilityBaselineOutputSchema } from '../../../schemas/sub-agents/seo/visibility-baseline.js';

export class SeoVisibilityBaselineAgent extends DirectorSubAgentBase {
  readonly id = 'seo.visibility_baseline' as const;
  readonly directorDomain = 'seo_digital' as const;
  readonly promptRef = 'server/prompts/sub-agents/seo/visibility-baseline.md';
  readonly outputSchema = SeoVisibilityBaselineOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/seo/visibility-baseline');
  }
}
