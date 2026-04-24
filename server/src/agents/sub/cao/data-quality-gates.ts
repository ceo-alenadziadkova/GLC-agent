import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoDataQualityGatesOutputSchema } from '../../../schemas/sub-agents/cao/data-quality-gates.js';

export class CaoDataQualityGatesAgent extends DirectorSubAgentBase {
  readonly id = 'cao.data_quality_gates' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/data-quality-gates.md';
  readonly outputSchema = CaoDataQualityGatesOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/data-quality-gates');
  }
}
