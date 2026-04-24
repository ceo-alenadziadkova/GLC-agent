import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CdoExperimentationOutputSchema } from '../../../schemas/sub-agents/cdo/experimentation.js';

export class CdoExperimentationAgent extends DirectorSubAgentBase {
  readonly id = 'cdo.experimentation' as const;
  readonly directorDomain = 'ux_conversion' as const;
  readonly promptRef = 'server/prompts/sub-agents/cdo/experimentation.md';
  readonly outputSchema = CdoExperimentationOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cdo/experimentation');
  }
}
