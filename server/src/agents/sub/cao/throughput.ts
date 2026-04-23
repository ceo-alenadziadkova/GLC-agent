import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoThroughputOutputSchema } from '../../../schemas/sub-agents/cao/throughput.js';

export class CaoThroughputAgent extends DirectorSubAgentBase {
  readonly id = 'cao.throughput' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/throughput.md';
  readonly outputSchema = CaoThroughputOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/throughput');
  }
}
