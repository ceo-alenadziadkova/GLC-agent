import { buildDirectorDomainStubBundle } from './director-domain-stub-bundles.service.js';
import { routeCaoDeepDive } from './director-cao-router.service.js';
import { logger } from '../logger.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';

/**
 * CAO deep-dive path until 13 zones are materialized as sub-agent registry entries.
 */
export function runCaoDirectorDeepDiveOrchestrator(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
}): DirectorWaveBundle {
  const route = routeCaoDeepDive({ goals: input.goals, constraints: input.constraints });
  logger.info('director_cao_orchestrator.run', {
    domain_key: input.domainKey,
    cao_zone_stage: route.zone_stage,
    cao_zone_focus: route.zone_focus,
  });
  return buildDirectorDomainStubBundle('cao_stub', {
    domainKey: input.domainKey,
    goals: input.goals,
    constraints: input.constraints,
  });
}
