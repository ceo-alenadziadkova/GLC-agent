import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoBuildVsBuyOutputSchema } from '../../../schemas/sub-agents/cao/build-vs-buy.js';

export class CaoBuildVsBuyAgent extends DirectorSubAgentBase {
  readonly id = 'cao.build_vs_buy' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/build-vs-buy.md';
  readonly outputSchema = CaoBuildVsBuyOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/build-vs-buy');
  }
}
