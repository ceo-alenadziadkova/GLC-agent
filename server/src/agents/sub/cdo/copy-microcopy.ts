import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CdoCopyMicrocopyOutputSchema } from '../../../schemas/sub-agents/cdo/copy-microcopy.js';

export class CdoCopyMicrocopyAgent extends DirectorSubAgentBase {
  readonly id = 'cdo.copy_microcopy' as const;
  readonly directorDomain = 'ux_conversion' as const;
  readonly promptRef = 'server/prompts/sub-agents/cdo/copy-microcopy.md';
  readonly outputSchema = CdoCopyMicrocopyOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cdo/copy-microcopy');
  }
}
