import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoSynthesisBundleOutputSchema } from '../../../schemas/sub-agents/cao/synthesis-bundle.js';

export class CaoSynthesisBundleAgent extends DirectorSubAgentBase {
  readonly id = 'cao.synthesis_bundle' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/synthesis-bundle.md';
  readonly outputSchema = CaoSynthesisBundleOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/synthesis-bundle');
  }
}
