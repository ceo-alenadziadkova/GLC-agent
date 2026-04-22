import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CmoPositioningOutputSchema } from '../../../schemas/sub-agents/cmo/positioning.js';

export class CmoAgent3Positioning extends DirectorSubAgentBase {
  readonly id = 'cmo.agent_3_positioning';
  readonly directorDomain = 'marketing_utp';
  readonly outputSchema = CmoPositioningOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cmo/agent-3-positioning');
  }
}
