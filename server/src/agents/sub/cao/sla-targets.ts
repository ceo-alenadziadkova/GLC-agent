import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoSlaTargetsOutputSchema } from '../../../schemas/sub-agents/cao/sla-targets.js';

export class CaoSlaTargetsAgent extends DirectorSubAgentBase {
  readonly id = 'cao.sla_targets' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/sla-targets.md';
  readonly outputSchema = CaoSlaTargetsOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/sla-targets');
  }
}
