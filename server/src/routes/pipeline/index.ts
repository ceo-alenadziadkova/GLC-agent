import { Router } from 'express';
import {
  requireAuth,
  attachProfile,
  requireRole,
  rejectGuestFromPortal,
} from '../../middleware/auth.js';
import { pipelineLimiter } from '../../middleware/rate-limit.js';
import { postPipelineStartController } from './controllers/post-pipeline-start.controller.js';
import { postPipelineNextController } from './controllers/post-pipeline-next.controller.js';
import { postPipelineRetryController } from './controllers/post-pipeline-retry.controller.js';
import { postPipelineStopController } from './controllers/post-pipeline-stop.controller.js';
import { getPipelineStatusController } from './controllers/get-pipeline-status.controller.js';
import { getQualityGateController } from './controllers/get-quality-gate.controller.js';
import { postReviewApproveController } from './controllers/post-review-approve.controller.js';

export const pipelineRouter = Router();

const consultantGuard = [requireAuth, attachProfile, requireRole('consultant')] as const;

pipelineRouter.post('/:id/pipeline/start', requireAuth, attachProfile, pipelineLimiter, postPipelineStartController);
pipelineRouter.post('/:id/pipeline/next', requireAuth, attachProfile, pipelineLimiter, postPipelineNextController);
pipelineRouter.post('/:id/pipeline/retry', ...consultantGuard, pipelineLimiter, postPipelineRetryController);
pipelineRouter.post('/:id/pipeline/stop', requireAuth, attachProfile, pipelineLimiter, postPipelineStopController);
pipelineRouter.get(
  '/:id/pipeline/status',
  requireAuth,
  attachProfile,
  rejectGuestFromPortal,
  getPipelineStatusController,
);
pipelineRouter.get(
  '/:id/quality-gate/:phase',
  requireAuth,
  attachProfile,
  rejectGuestFromPortal,
  getQualityGateController,
);
pipelineRouter.post('/:id/reviews/:phase', ...consultantGuard, postReviewApproveController);
