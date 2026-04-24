import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { SeoMeasurementExperimentationOutputSchema } from '../../../schemas/sub-agents/seo/measurement-experimentation.js';

export class SeoMeasurementExperimentationAgent extends DirectorSubAgentBase {
  readonly id = 'seo.measurement_experimentation' as const;
  readonly directorDomain = 'seo_digital' as const;
  readonly promptRef = 'server/prompts/sub-agents/seo/measurement-experimentation.md';
  readonly outputSchema = SeoMeasurementExperimentationOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/seo/measurement-experimentation');
  }
}
