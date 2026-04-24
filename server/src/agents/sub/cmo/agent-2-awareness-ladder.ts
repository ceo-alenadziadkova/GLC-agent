import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CmoAwarenessLadderOutputSchema } from '../../../schemas/sub-agents/cmo/awareness-ladder.js';

export class CmoAgent2AwarenessLadder extends DirectorSubAgentBase {
  readonly id = 'cmo.agent_2_awareness_ladder' as const;
  readonly directorDomain = 'marketing_utp' as const;
  readonly promptRef = 'server/prompts/sub-agents/cmo/agent-2-awareness-ladder.md';
  readonly outputSchema = CmoAwarenessLadderOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cmo/agent-2-awareness-ladder');
  }
}
