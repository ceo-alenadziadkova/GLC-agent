import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoAdoptionRolloutGovernanceOutputSchema } from '../../../schemas/sub-agents/cao/adoption-rollout-governance.js';

export class CaoAdoptionRolloutGovernanceAgent extends DirectorSubAgentBase {
  readonly id = 'cao.adoption_rollout_governance' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/adoption-rollout-governance.md';
  readonly outputSchema = CaoAdoptionRolloutGovernanceOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/adoption-rollout-governance');
  }
}
