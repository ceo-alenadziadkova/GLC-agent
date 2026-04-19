import { Router } from 'express';
import { attachProfile, requireAuth, requireRole } from '../../middleware/auth.js';
import { generalLimiter } from '../../middleware/rate-limit.js';
import { PLATFORM_CONSULTANT_ROLE } from '../../config/platform-role-policy.js';
import { getSelfServeOwnerHandler, patchSelfServeOwnerHandler } from './controllers/self-serve-owner.controller.js';
import { getRuntimePoliciesHandler, patchRuntimePoliciesHandler } from './controllers/runtime-policies.controller.js';
import {
  addConsultantAllowlistHandler,
  getConsultantAllowlistHandler,
  removeConsultantAllowlistHandler,
} from './controllers/consultant-allowlist.controller.js';
import { postBenchmarkRecomputeHandler } from './controllers/benchmarks.controller.js';
import { postBanditRecomputeHandler } from './controllers/bandits.controller.js';
import { postPlatformPipelineResumeCancelledController } from './controllers/post-pipeline-resume-cancelled.controller.js';

export const platformRouter = Router();

platformRouter.use(requireAuth);
platformRouter.use(generalLimiter);
platformRouter.use(attachProfile);

platformRouter.get('/self-serve-owner', requireRole(PLATFORM_CONSULTANT_ROLE), getSelfServeOwnerHandler);
platformRouter.patch('/self-serve-owner', requireRole(PLATFORM_CONSULTANT_ROLE), patchSelfServeOwnerHandler);

platformRouter.get('/runtime-policies', requireRole(PLATFORM_CONSULTANT_ROLE), getRuntimePoliciesHandler);
platformRouter.patch('/runtime-policies', requireRole(PLATFORM_CONSULTANT_ROLE), patchRuntimePoliciesHandler);

platformRouter.get('/consultant-allowlist', requireRole(PLATFORM_CONSULTANT_ROLE), getConsultantAllowlistHandler);
platformRouter.post('/consultant-allowlist', requireRole(PLATFORM_CONSULTANT_ROLE), addConsultantAllowlistHandler);
platformRouter.delete('/consultant-allowlist', requireRole(PLATFORM_CONSULTANT_ROLE), removeConsultantAllowlistHandler);

platformRouter.post('/benchmarks/recompute', requireRole(PLATFORM_CONSULTANT_ROLE), postBenchmarkRecomputeHandler);
platformRouter.post('/bandits/recompute', requireRole(PLATFORM_CONSULTANT_ROLE), postBanditRecomputeHandler);

platformRouter.post(
  '/audits/:id/pipeline/resume-cancelled',
  requireRole(PLATFORM_CONSULTANT_ROLE),
  postPlatformPipelineResumeCancelledController,
);
