import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CdoBehavioralPsychologyOutputSchema } from '../../../schemas/sub-agents/cdo/behavioral-psychology.js';

export class CdoBehavioralPsychologyAgent extends DirectorSubAgentBase {
  readonly id = 'cdo.behavioral_psychology' as const;
  readonly directorDomain = 'ux_conversion' as const;
  readonly promptRef = 'server/prompts/sub-agents/cdo/behavioral-psychology.md';
  readonly outputSchema = CdoBehavioralPsychologyOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cdo/behavioral-psychology');
  }
}
