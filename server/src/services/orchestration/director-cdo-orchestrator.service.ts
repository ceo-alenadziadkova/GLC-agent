import { routeCdoDeepDiveCase } from './director-cdo-router.service.js';
import { buildCdoMaterializedWaveBundle } from './director-domain-materialized-bundles.service.js';
import { logger } from '../logger.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';

/**
 * CDO deep-dive: router case + deterministic multi-action wave (MVP). LLM sub-agents can replace internals later.
 */
export function runCdoDirectorDeepDiveOrchestrator(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
}): DirectorWaveBundle {
  const cdoCase = routeCdoDeepDiveCase({ goals: input.goals, constraints: input.constraints });
  logger.info('director_cdo_orchestrator.run', { domain_key: input.domainKey, cdo_case: cdoCase });
  return buildCdoMaterializedWaveBundle({
    domainKey: input.domainKey,
    goals: input.goals,
    constraints: input.constraints,
    cdoCase,
  });
}
