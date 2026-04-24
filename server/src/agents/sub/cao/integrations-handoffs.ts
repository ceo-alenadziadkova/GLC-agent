import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoIntegrationsHandoffsOutputSchema } from '../../../schemas/sub-agents/cao/integrations-handoffs.js';

export class CaoIntegrationsHandoffsAgent extends DirectorSubAgentBase {
  readonly id = 'cao.integrations_handoffs' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/integrations-handoffs.md';
  readonly outputSchema = CaoIntegrationsHandoffsOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/integrations-handoffs');
  }
}
