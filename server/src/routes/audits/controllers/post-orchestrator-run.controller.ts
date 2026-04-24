import type { Response } from 'express';

import { idempotencyPostAuditsOrchestratorRunKey } from '../../../config/api-http-paths.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { executePostOrchestrationPack } from './post-orchestration-pack.controller.js';
import { markOrchestratorAliasDeprecated } from './orchestrator-legacy-alias.js';

/**
 * Compatibility alias for Orchestrator v1 API.
 * Reuses existing orchestration pack run service/controller flow.
 */
export async function postOrchestratorRunController(req: AuthRequest, res: Response) {
  markOrchestratorAliasDeprecated(res);
  await executePostOrchestrationPack(req, res, idempotencyPostAuditsOrchestratorRunKey(req.params.id as string));
}

