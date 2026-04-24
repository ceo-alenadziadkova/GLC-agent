import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoSopGovernanceOutputSchema } from '../../../schemas/sub-agents/cao/sop-governance.js';

export class CaoSopGovernanceAgent extends DirectorSubAgentBase {
  readonly id = 'cao.sop_governance' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/sop-governance.md';
  readonly outputSchema = CaoSopGovernanceOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/sop-governance');
  }
}
