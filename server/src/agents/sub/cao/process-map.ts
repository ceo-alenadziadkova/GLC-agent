import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoProcessMapOutputSchema } from '../../../schemas/sub-agents/cao/process-map.js';

export class CaoProcessMapAgent extends DirectorSubAgentBase {
  readonly id = 'cao.process_map' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/process-map.md';
  readonly outputSchema = CaoProcessMapOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/process-map');
  }
}
