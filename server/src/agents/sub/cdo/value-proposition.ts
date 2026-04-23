import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CdoValuePropositionOutputSchema } from '../../../schemas/sub-agents/cdo/value-proposition.js';

export class CdoValuePropositionAgent extends DirectorSubAgentBase {
  readonly id = 'cdo.value_proposition' as const;
  readonly directorDomain = 'ux_conversion' as const;
  readonly promptRef = 'server/prompts/sub-agents/cdo/value-proposition.md';
  readonly outputSchema = CdoValuePropositionOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cdo/value-proposition');
  }
}
