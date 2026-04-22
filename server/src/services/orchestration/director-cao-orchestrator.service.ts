import { routeCaoDeepDive } from './director-cao-router.service.js';
import { buildCaoMaterializedWaveBundle } from './director-domain-materialized-bundles.service.js';
import { logger } from '../logger.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';

/**
 * CAO deep-dive: two-stage heuristics + deterministic MVP zone wave.
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
  return buildCaoMaterializedWaveBundle({
    domainKey: input.domainKey,
    goals: input.goals,
    constraints: input.constraints,
    route,
  });
}
