import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CsoSdlcAccessGovernanceOutputSchema } from '../../../schemas/sub-agents/cso/sdlc-access-governance.js';

export class CsoSdlcAccessGovernanceAgent extends DirectorSubAgentBase {
  readonly id = 'cso.sdlc_access_governance' as const;
  readonly directorDomain = 'security_compliance' as const;
  readonly promptRef = 'server/prompts/sub-agents/cso/sdlc-access-governance.md';
  readonly outputSchema = CsoSdlcAccessGovernanceOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cso/sdlc-access-governance');
  }
}
