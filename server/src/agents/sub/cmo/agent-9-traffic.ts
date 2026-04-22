import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CmoTrafficOutputSchema } from '../../../schemas/sub-agents/cmo/traffic.js';

export class CmoAgent9Traffic extends DirectorSubAgentBase {
  readonly id = 'cmo.agent_9_traffic';
  readonly directorDomain = 'marketing_utp';
  readonly outputSchema = CmoTrafficOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cmo/agent-9-traffic');
  }
}
