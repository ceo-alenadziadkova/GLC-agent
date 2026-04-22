import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CmoViralOutputSchema } from '../../../schemas/sub-agents/cmo/viral.js';

export class CmoAgent6Viral extends DirectorSubAgentBase {
  readonly id = 'cmo.agent_6_viral' as const;
  readonly directorDomain = 'marketing_utp' as const;
  readonly promptRef = 'server/prompts/sub-agents/cmo/agent-6-viral.md';
  readonly outputSchema = CmoViralOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cmo/agent-6-viral');
  }
}
