import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CsoComplianceMapOutputSchema } from '../../../schemas/sub-agents/cso/compliance-map.js';

export class CsoComplianceMapAgent extends DirectorSubAgentBase {
  readonly id = 'cso.compliance_map' as const;
  readonly directorDomain = 'security_compliance' as const;
  readonly promptRef = 'server/prompts/sub-agents/cso/compliance-map.md';
  readonly outputSchema = CsoComplianceMapOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cso/compliance-map');
  }
}
