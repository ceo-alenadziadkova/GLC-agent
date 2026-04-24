import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CtoDeliveryReleaseSafetyOutputSchema } from '../../../schemas/sub-agents/cto/delivery-release-safety.js';

export class CtoDeliveryReleaseSafetyAgent extends DirectorSubAgentBase {
  readonly id = 'cto.delivery_release_safety' as const;
  readonly directorDomain = 'tech_infrastructure' as const;
  readonly promptRef = 'server/prompts/sub-agents/cto/delivery-release-safety.md';
  readonly outputSchema = CtoDeliveryReleaseSafetyOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cto/delivery-release-safety');
  }
}
