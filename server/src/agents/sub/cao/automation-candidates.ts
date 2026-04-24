import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoAutomationCandidatesOutputSchema } from '../../../schemas/sub-agents/cao/automation-candidates.js';

export class CaoAutomationCandidatesAgent extends DirectorSubAgentBase {
  readonly id = 'cao.automation_candidates' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/automation-candidates.md';
  readonly outputSchema = CaoAutomationCandidatesOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/automation-candidates');
  }
}
