import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CdoFrictionOutputSchema } from '../../../schemas/sub-agents/cdo/friction.js';

export class CdoFrictionAgent extends DirectorSubAgentBase {
  readonly id = 'cdo.friction' as const;
  readonly directorDomain = 'ux_conversion' as const;
  readonly promptRef = 'server/prompts/sub-agents/cdo/friction.md';
  readonly outputSchema = CdoFrictionOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cdo/friction');
  }
}
