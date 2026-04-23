import { Router } from 'express';

import { attachProfile, requireAuth, requireRole } from '../../middleware/auth.js';
import { intakePublicReadLimiter, intakePublicWriteLimiter } from '../../middleware/rate-limit.js';
import { getIntakePrefillController } from './controllers/get-intake-prefill.controller.js';
import { getIntakePublicController } from './controllers/get-intake-public.controller.js';
import { getIntakeSubmissionsController } from './controllers/get-intake-submissions.controller.js';
import { getIntakeIntelligenceKpiDashboardController } from './controllers/get-intake-intelligence-kpi-dashboard.controller.js';
import { postIntakeLinkAuditController } from './controllers/post-intake-link-audit.controller.js';
import { postIntakePlanTraceController } from './controllers/post-intake-plan-trace.controller.js';
import { postIntakeIntelligenceKpiController } from './controllers/post-intake-intelligence-kpi.controller.js';
import { postIntakeNlDescribeController } from './controllers/post-intake-nl-describe.controller.js';
import { postIntakeRespondController } from './controllers/post-intake-respond.controller.js';
import { postIntakeTokenController } from './controllers/post-intake-token.controller.js';

export const intakeRouter = Router();

intakeRouter.post('/', requireAuth, attachProfile, requireRole('consultant'), postIntakeTokenController);

intakeRouter.post(
  '/link-audit',
  requireAuth,
  attachProfile,
  requireRole('consultant'),
  postIntakeLinkAuditController,
);

intakeRouter.get(
  '/intelligence-kpi/dashboard',
  requireAuth,
  attachProfile,
  requireRole('consultant'),
  getIntakeIntelligenceKpiDashboardController,
);

intakeRouter.get(
  '/submissions',
  requireAuth,
  attachProfile,
  requireRole('consultant'),
  getIntakeSubmissionsController,
);

intakeRouter.get(
  '/prefill/:token',
  requireAuth,
  attachProfile,
  requireRole('consultant'),
  getIntakePrefillController,
);

intakeRouter.post(
  '/plan-trace',
  requireAuth,
  attachProfile,
  requireRole('consultant'),
  postIntakePlanTraceController,
);

intakeRouter.get('/:token', intakePublicReadLimiter, getIntakePublicController);

intakeRouter.post('/:token/nl-describe', intakePublicWriteLimiter, postIntakeNlDescribeController);

intakeRouter.post('/:token/intelligence-kpi', intakePublicWriteLimiter, postIntakeIntelligenceKpiController);

intakeRouter.post('/:token/respond', intakePublicWriteLimiter, postIntakeRespondController);
