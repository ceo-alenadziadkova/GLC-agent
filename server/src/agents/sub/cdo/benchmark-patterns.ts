import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CdoBenchmarkPatternsOutputSchema } from '../../../schemas/sub-agents/cdo/benchmark-patterns.js';

export class CdoBenchmarkPatternsAgent extends DirectorSubAgentBase {
  readonly id = 'cdo.benchmark_patterns' as const;
  readonly directorDomain = 'ux_conversion' as const;
  readonly promptRef = 'server/prompts/sub-agents/cdo/benchmark-patterns.md';
  readonly outputSchema = CdoBenchmarkPatternsOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cdo/benchmark-patterns');
  }
}
