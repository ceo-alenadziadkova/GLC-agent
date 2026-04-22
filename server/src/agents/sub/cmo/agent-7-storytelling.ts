import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CmoStorytellingOutputSchema } from '../../../schemas/sub-agents/cmo/storytelling.js';

export class CmoAgent7Storytelling extends DirectorSubAgentBase {
  readonly id = 'cmo.agent_7_storytelling' as const;
  readonly directorDomain = 'marketing_utp' as const;
  readonly promptRef = 'server/prompts/sub-agents/cmo/agent-7-storytelling.md';
  readonly outputSchema = CmoStorytellingOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cmo/agent-7-storytelling');
  }
}
