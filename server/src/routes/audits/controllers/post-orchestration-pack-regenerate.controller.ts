import type { Response } from 'express';

import { idempotencyPostAuditsOrchestrationPackRegenerateKey } from '../../../config/api-http-paths.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { executePostOrchestrationPack } from './post-orchestration-pack.controller.js';

export async function postOrchestrationPackRegenerateController(req: AuthRequest, res: Response) {
  const route = idempotencyPostAuditsOrchestrationPackRegenerateKey(req.params.id as string);
  await executePostOrchestrationPack(req, res, route);
}
