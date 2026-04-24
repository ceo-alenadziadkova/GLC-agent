import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CtoObservabilityIncidentOutputSchema } from '../../../schemas/sub-agents/cto/observability-incident.js';

export class CtoObservabilityIncidentAgent extends DirectorSubAgentBase {
  readonly id = 'cto.observability_incident' as const;
  readonly directorDomain = 'tech_infrastructure' as const;
  readonly promptRef = 'server/prompts/sub-agents/cto/observability-incident.md';
  readonly outputSchema = CtoObservabilityIncidentOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cto/observability-incident');
  }
}
