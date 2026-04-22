import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CmoContentStrategyOutputSchema } from '../../../schemas/sub-agents/cmo/content-strategy.js';

export class CmoAgent5ContentStrategy extends DirectorSubAgentBase {
  readonly id = 'cmo.agent_5_content_strategy';
  readonly directorDomain = 'marketing_utp';
  readonly outputSchema = CmoContentStrategyOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cmo/agent-5-content-strategy');
  }
}
