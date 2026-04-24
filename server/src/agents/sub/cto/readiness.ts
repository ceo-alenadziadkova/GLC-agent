import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CtoReadinessOutputSchema } from '../../../schemas/sub-agents/cto/readiness.js';

export class CtoReadinessAgent extends DirectorSubAgentBase {
  readonly id = 'cto.readiness' as const;
  readonly directorDomain = 'tech_infrastructure' as const;
  readonly promptRef = 'server/prompts/sub-agents/cto/readiness.md';
  readonly outputSchema = CtoReadinessOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cto/readiness');
  }
}
