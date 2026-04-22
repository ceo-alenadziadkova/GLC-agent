import { buildDirectorDomainStubBundle } from './director-domain-stub-bundles.service.js';
import { routeCdoDeepDiveCase } from './director-cdo-router.service.js';
import { logger } from '../logger.js';
import type { DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';

/**
 * CDO deep-dive path until JTBD / funnel / experimentation sub-agents are wired.
 * Emits a valid director wave bundle + structured routing metadata in logs.
 */
export function runCdoDirectorDeepDiveOrchestrator(input: {
  domainKey: string;
  goals: string[];
  constraints: string[];
}): DirectorWaveBundle {
  const cdoCase = routeCdoDeepDiveCase({ goals: input.goals, constraints: input.constraints });
  logger.info('director_cdo_orchestrator.run', { domain_key: input.domainKey, cdo_case: cdoCase });
  return buildDirectorDomainStubBundle('cdo_stub', {
    domainKey: input.domainKey,
    goals: input.goals,
    constraints: input.constraints,
  });
}
