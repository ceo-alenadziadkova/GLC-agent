import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CtoArchitectureRiskModelOutputSchema } from '../../../schemas/sub-agents/cto/architecture-risk-model.js';

export class CtoArchitectureRiskModelAgent extends DirectorSubAgentBase {
  readonly id = 'cto.architecture_risk_model' as const;
  readonly directorDomain = 'tech_infrastructure' as const;
  readonly promptRef = 'server/prompts/sub-agents/cto/architecture-risk-model.md';
  readonly outputSchema = CtoArchitectureRiskModelOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cto/architecture-risk-model');
  }
}
