import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CtoReadinessBaselineOutputSchema } from '../../../schemas/sub-agents/cto/readiness-baseline.js';

export class CtoReadinessBaselineAgent extends DirectorSubAgentBase {
  readonly id = 'cto.readiness_baseline' as const;
  readonly directorDomain = 'tech_infrastructure' as const;
  readonly promptRef = 'server/prompts/sub-agents/cto/readiness-baseline.md';
  readonly outputSchema = CtoReadinessBaselineOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cto/readiness-baseline');
  }
}
