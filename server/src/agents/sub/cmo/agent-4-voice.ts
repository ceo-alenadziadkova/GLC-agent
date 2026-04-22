import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CmoVoiceOutputSchema } from '../../../schemas/sub-agents/cmo/voice.js';

export class CmoAgent4Voice extends DirectorSubAgentBase {
  readonly id = 'cmo.agent_4_voice' as const;
  readonly directorDomain = 'marketing_utp' as const;
  readonly promptRef = 'server/prompts/sub-agents/cmo/agent-4-voice.md';
  readonly outputSchema = CmoVoiceOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cmo/agent-4-voice');
  }
}
