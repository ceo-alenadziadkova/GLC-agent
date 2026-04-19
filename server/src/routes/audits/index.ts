import { Router } from 'express';
import {
  attachProfile,
  rejectGuestFromPortal,
  requireAuth,
  requireRole,
} from '../../middleware/auth.js';
import { createAuditLimiter, generalLimiter } from '../../middleware/rate-limit.js';
import { createAuditController } from './controllers/create-audit.controller.js';
import { listAuditsController } from './controllers/list-audits.controller.js';
import { tokenUsageSummaryController } from './controllers/token-usage-summary.controller.js';
import { getStrategyExecutionPacksController } from './controllers/get-strategy-execution-packs.controller.js';
import { patchStrategyLabContextController } from './controllers/patch-strategy-lab-context.controller.js';
import { postStrategyExecutionPackController } from './controllers/post-strategy-execution-pack.controller.js';
import { getAuditController } from './controllers/get-audit.controller.js';
import { upgradeFromSnapshotController } from './controllers/upgrade-snapshot.controller.js';
import { deleteAuditController } from './controllers/delete-audit.controller.js';
import { getBriefSchemaController } from './controllers/brief/get-brief-schema.controller.js';
import { postBriefAnalyticsController } from './controllers/brief/post-brief-analytics.controller.js';
import { getBriefController } from './controllers/brief/get-brief.controller.js';
import { postBriefHelpRequestController } from './controllers/brief/post-brief-help-request.controller.js';
import { putBriefController } from './controllers/brief/put-brief.controller.js';

export const auditsRouter = Router();

auditsRouter.use(requireAuth);
auditsRouter.use(generalLimiter);

const consultantGuard = [attachProfile, requireRole('consultant')] as const;

auditsRouter.post('/', attachProfile, createAuditLimiter, createAuditController);
auditsRouter.get('/', attachProfile, rejectGuestFromPortal, listAuditsController);
auditsRouter.get(
  '/token-usage-summary',
  ...consultantGuard,
  rejectGuestFromPortal,
  tokenUsageSummaryController,
);
auditsRouter.post(
  '/:id/strategy/execution-pack',
  attachProfile,
  rejectGuestFromPortal,
  postStrategyExecutionPackController,
);
auditsRouter.get(
  '/:id/strategy/execution-packs',
  attachProfile,
  rejectGuestFromPortal,
  getStrategyExecutionPacksController,
);
auditsRouter.patch(
  '/:id/strategy/lab-context',
  attachProfile,
  rejectGuestFromPortal,
  patchStrategyLabContextController,
);
auditsRouter.get('/:id', attachProfile, rejectGuestFromPortal, getAuditController);
auditsRouter.post('/:id/upgrade-from-snapshot', attachProfile, rejectGuestFromPortal, upgradeFromSnapshotController);
auditsRouter.delete('/:id', ...consultantGuard, deleteAuditController);
auditsRouter.get('/:id/brief/schema', attachProfile, rejectGuestFromPortal, getBriefSchemaController);
auditsRouter.post('/:id/brief/analytics-events', attachProfile, rejectGuestFromPortal, postBriefAnalyticsController);
auditsRouter.get('/:id/brief', attachProfile, rejectGuestFromPortal, getBriefController);
auditsRouter.post('/:id/brief/help-request', attachProfile, postBriefHelpRequestController);
auditsRouter.put('/:id/brief', attachProfile, rejectGuestFromPortal, putBriefController);
