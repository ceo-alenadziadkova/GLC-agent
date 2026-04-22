import { routeCsoDeepDiveCase } from './director-cso-router.service.js';
import { buildCsoMaterializedWaveBundle } from './director-domain-materialized-bundles.service.js';
import { logger } from '../logger.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';

/**
 * CSO deep-dive: case routing + deterministic threat/compliance wave (MVP).
 */
export function runCsoDirectorDeepDiveOrchestrator(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
}): DirectorWaveBundle {
  const csoCase = routeCsoDeepDiveCase({ goals: input.goals, constraints: input.constraints });
  logger.info('director_cso_orchestrator.run', { domain_key: input.domainKey, cso_case: csoCase });
  return buildCsoMaterializedWaveBundle({
    domainKey: input.domainKey,
    goals: input.goals,
    constraints: input.constraints,
    csoCase,
  });
}
