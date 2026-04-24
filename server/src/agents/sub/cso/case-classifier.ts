import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CsoCaseClassifierOutputSchema } from '../../../schemas/sub-agents/cso/case-classifier.js';

export class CsoCaseClassifierAgent extends DirectorSubAgentBase {
  readonly id = 'cso.case_classifier' as const;
  readonly directorDomain = 'security_compliance' as const;
  readonly promptRef = 'server/prompts/sub-agents/cso/case-classifier.md';
  readonly outputSchema = CsoCaseClassifierOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cso/case-classifier');
  }
}
