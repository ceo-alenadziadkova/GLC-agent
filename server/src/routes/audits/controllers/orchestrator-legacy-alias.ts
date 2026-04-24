import type { Response } from 'express';
import { ORCHESTRATION_CONTRACT_POLICY } from '../../../config/orchestration-contract-policy.js';

/**
 * Tags v1 orchestrator aliases as deprecated while compatibility window is active.
 */
export function markOrchestratorAliasDeprecated(res: Response): void {
  const { sunsetDate, docsPath } = ORCHESTRATION_CONTRACT_POLICY.orchestratorAliasDeprecation;
  res.setHeader('Deprecation', 'true');
  res.setHeader('Sunset', sunsetDate);
  res.setHeader('Link', `<${docsPath}>; rel="deprecation"; type="text/markdown"`);
}

