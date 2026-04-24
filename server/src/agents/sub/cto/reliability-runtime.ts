import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CtoReliabilityRuntimeOutputSchema } from '../../../schemas/sub-agents/cto/reliability-runtime.js';

export class CtoReliabilityRuntimeAgent extends DirectorSubAgentBase {
  readonly id = 'cto.reliability_runtime' as const;
  readonly directorDomain = 'tech_infrastructure' as const;
  readonly promptRef = 'server/prompts/sub-agents/cto/reliability-runtime.md';
  readonly outputSchema = CtoReliabilityRuntimeOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cto/reliability-runtime');
  }
}
