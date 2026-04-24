import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CtoSecuritySupplyChainOutputSchema } from '../../../schemas/sub-agents/cto/security-supply-chain.js';

export class CtoSecuritySupplyChainAgent extends DirectorSubAgentBase {
  readonly id = 'cto.security_supply_chain' as const;
  readonly directorDomain = 'tech_infrastructure' as const;
  readonly promptRef = 'server/prompts/sub-agents/cto/security-supply-chain.md';
  readonly outputSchema = CtoSecuritySupplyChainOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cto/security-supply-chain');
  }
}
