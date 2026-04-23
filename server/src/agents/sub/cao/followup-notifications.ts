import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoFollowupNotificationsOutputSchema } from '../../../schemas/sub-agents/cao/followup-notifications.js';

export class CaoFollowupNotificationsAgent extends DirectorSubAgentBase {
  readonly id = 'cao.followup_notifications' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/followup-notifications.md';
  readonly outputSchema = CaoFollowupNotificationsOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/followup-notifications');
  }
}
