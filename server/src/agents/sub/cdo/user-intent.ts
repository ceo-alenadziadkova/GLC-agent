import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CdoUserIntentOutputSchema } from '../../../schemas/sub-agents/cdo/user-intent.js';

export class CdoUserIntentAgent extends DirectorSubAgentBase {
  readonly id = 'cdo.user_intent' as const;
  readonly directorDomain = 'ux_conversion' as const;
  readonly promptRef = 'server/prompts/sub-agents/cdo/user-intent.md';
  readonly outputSchema = CdoUserIntentOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cdo/user-intent');
  }
}
