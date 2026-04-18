import { Router } from 'express';
import { attachProfile, requireAuth, requireRole } from '../../middleware/auth.js';
import { generalLimiter } from '../../middleware/rate-limit.js';
import { getWordingDraftsController } from './controllers/get-wording-drafts.controller.js';
import { getWordingPublicationLogController } from './controllers/get-wording-publication-log.controller.js';
import { postAnalyticsEventsController } from './controllers/post-analytics-events.controller.js';
import { postWordingPublishController } from './controllers/post-wording-publish.controller.js';
import { postWordingRollbackController } from './controllers/post-wording-rollback.controller.js';
import { putWordingDraftsController } from './controllers/put-wording-drafts.controller.js';

export const intakeTraceToolRouter = Router();

intakeTraceToolRouter.use(requireAuth);
intakeTraceToolRouter.use(attachProfile);
intakeTraceToolRouter.use(requireRole('consultant'));
intakeTraceToolRouter.use(generalLimiter);

intakeTraceToolRouter.post('/analytics-events', postAnalyticsEventsController);
intakeTraceToolRouter.get('/wording-drafts', getWordingDraftsController);
intakeTraceToolRouter.put('/wording-drafts', putWordingDraftsController);
intakeTraceToolRouter.post('/wording-drafts/publish', postWordingPublishController);
intakeTraceToolRouter.post('/wording-drafts/rollback', postWordingRollbackController);
intakeTraceToolRouter.get('/wording-publication-log', getWordingPublicationLogController);
