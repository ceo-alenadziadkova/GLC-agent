import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CdoFunnelArchitectOutputSchema } from '../../../schemas/sub-agents/cdo/funnel-architect.js';

export class CdoFunnelArchitectAgent extends DirectorSubAgentBase {
  readonly id = 'cdo.funnel_architect' as const;
  readonly directorDomain = 'ux_conversion' as const;
  readonly promptRef = 'server/prompts/sub-agents/cdo/funnel-architect.md';
  readonly outputSchema = CdoFunnelArchitectOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cdo/funnel-architect');
  }
}
