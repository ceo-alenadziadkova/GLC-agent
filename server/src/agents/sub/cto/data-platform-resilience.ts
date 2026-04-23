import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CtoDataPlatformResilienceOutputSchema } from '../../../schemas/sub-agents/cto/data-platform-resilience.js';

export class CtoDataPlatformResilienceAgent extends DirectorSubAgentBase {
  readonly id = 'cto.data_platform_resilience' as const;
  readonly directorDomain = 'tech_infrastructure' as const;
  readonly promptRef = 'server/prompts/sub-agents/cto/data-platform-resilience.md';
  readonly outputSchema = CtoDataPlatformResilienceOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cto/data-platform-resilience');
  }
}
