import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CdoAnalyticsTrackingOutputSchema } from '../../../schemas/sub-agents/cdo/analytics-tracking.js';

export class CdoAnalyticsTrackingAgent extends DirectorSubAgentBase {
  readonly id = 'cdo.analytics_tracking' as const;
  readonly directorDomain = 'ux_conversion' as const;
  readonly promptRef = 'server/prompts/sub-agents/cdo/analytics-tracking.md';
  readonly outputSchema = CdoAnalyticsTrackingOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cdo/analytics-tracking');
  }
}
