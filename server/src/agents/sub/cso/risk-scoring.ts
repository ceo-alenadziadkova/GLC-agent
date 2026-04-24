import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CsoRiskScoringOutputSchema } from '../../../schemas/sub-agents/cso/risk-scoring.js';

export class CsoRiskScoringAgent extends DirectorSubAgentBase {
  readonly id = 'cso.risk_scoring' as const;
  readonly directorDomain = 'security_compliance' as const;
  readonly promptRef = 'server/prompts/sub-agents/cso/risk-scoring.md';
  readonly outputSchema = CsoRiskScoringOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cso/risk-scoring');
  }
}
