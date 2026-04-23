import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CsoThreatModelOutputSchema } from '../../../schemas/sub-agents/cso/threat-model.js';

export class CsoThreatModelAgent extends DirectorSubAgentBase {
  readonly id = 'cso.threat_model' as const;
  readonly directorDomain = 'security_compliance' as const;
  readonly promptRef = 'server/prompts/sub-agents/cso/threat-model.md';
  readonly outputSchema = CsoThreatModelOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cso/threat-model');
  }
}
