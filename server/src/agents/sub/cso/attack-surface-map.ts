import { loadPrompt } from '../../base.js';
import { DirectorSubAgentBase } from '../../director-sub-agent-base.js';
import { CsoAttackSurfaceMapOutputSchema } from '../../../schemas/sub-agents/cso/attack-surface-map.js';

export class CsoAttackSurfaceMapAgent extends DirectorSubAgentBase {
  readonly id = 'cso.attack_surface_map' as const;
  readonly directorDomain = 'security_compliance' as const;
  readonly promptRef = 'server/prompts/sub-agents/cso/attack-surface-map.md';
  readonly outputSchema = CsoAttackSurfaceMapOutputSchema;

  buildInstructions(_context: string, _mode: string): string {
    return loadPrompt('sub-agents/cso/attack-surface-map');
  }
}
