import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CdoUiConsistencyOutputSchema } from '../../../schemas/sub-agents/cdo/ui-consistency.js';

export class CdoUiConsistencyAgent extends DirectorSubAgentBase {
  readonly id = 'cdo.ui_consistency' as const;
  readonly directorDomain = 'ux_conversion' as const;
  readonly promptRef = 'server/prompts/sub-agents/cdo/ui-consistency.md';
  readonly outputSchema = CdoUiConsistencyOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cdo/ui-consistency');
  }
}
