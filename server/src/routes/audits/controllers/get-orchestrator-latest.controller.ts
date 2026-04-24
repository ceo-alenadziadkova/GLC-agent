import type { Response } from 'express';

import type { AuthRequest } from '../../../middleware/auth.js';
import { getOrchestrationPackController } from './get-orchestration-pack.controller.js';
import { markOrchestratorAliasDeprecated } from './orchestrator-legacy-alias.js';

/**
 * Compatibility alias for Orchestrator v1 API.
 */
export async function getOrchestratorLatestController(req: AuthRequest, res: Response) {
  markOrchestratorAliasDeprecated(res);
  await getOrchestrationPackController(req, res);
}

