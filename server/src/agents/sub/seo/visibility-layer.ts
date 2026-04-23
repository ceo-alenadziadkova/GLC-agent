import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { SeoVisibilityLayerOutputSchema } from '../../../schemas/sub-agents/seo/visibility-layer.js';

export class SeoVisibilityLayerAgent extends DirectorSubAgentBase {
  readonly id = 'seo.visibility_layer' as const;
  readonly directorDomain = 'seo_digital' as const;
  readonly promptRef = 'server/prompts/sub-agents/seo/visibility-layer.md';
  readonly outputSchema = SeoVisibilityLayerOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/seo/visibility-layer');
  }
}
