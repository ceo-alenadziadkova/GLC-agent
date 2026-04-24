import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CsoIncidentReadinessOutputSchema } from '../../../schemas/sub-agents/cso/incident-readiness.js';

export class CsoIncidentReadinessAgent extends DirectorSubAgentBase {
  readonly id = 'cso.incident_readiness' as const;
  readonly directorDomain = 'security_compliance' as const;
  readonly promptRef = 'server/prompts/sub-agents/cso/incident-readiness.md';
  readonly outputSchema = CsoIncidentReadinessOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cso/incident-readiness');
  }
}
