import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CaoAiOpsGuardrailsOutputSchema } from '../../../schemas/sub-agents/cao/ai-ops-guardrails.js';

export class CaoAiOpsGuardrailsAgent extends DirectorSubAgentBase {
  readonly id = 'cao.ai_ops_guardrails' as const;
  readonly directorDomain = 'automation_processes' as const;
  readonly promptRef = 'server/prompts/sub-agents/cao/ai-ops-guardrails.md';
  readonly outputSchema = CaoAiOpsGuardrailsOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cao/ai-ops-guardrails');
  }
}
