import { buildDirectorDomainStubBundle } from './director-domain-stub-bundles.service.js';
import { routeCsoDeepDiveCase } from './director-cso-router.service.js';
import { logger } from '../logger.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';

/**
 * CSO deep-dive path until threat model + compliance map zones ship.
 */
export function runCsoDirectorDeepDiveOrchestrator(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
}): DirectorWaveBundle {
  const csoCase = routeCsoDeepDiveCase({ goals: input.goals, constraints: input.constraints });
  logger.info('director_cso_orchestrator.run', { domain_key: input.domainKey, cso_case: csoCase });
  return buildDirectorDomainStubBundle('cso_stub', {
    domainKey: input.domainKey,
    goals: input.goals,
    constraints: input.constraints,
  });
}
