import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CsoMetricsFrameworkOutputSchema } from '../../../schemas/sub-agents/cso/metrics-framework.js';

export class CsoMetricsFrameworkAgent extends DirectorSubAgentBase {
  readonly id = 'cso.metrics_framework' as const;
  readonly directorDomain = 'security_compliance' as const;
  readonly promptRef = 'server/prompts/sub-agents/cso/metrics-framework.md';
  readonly outputSchema = CsoMetricsFrameworkOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cso/metrics-framework');
  }
}
