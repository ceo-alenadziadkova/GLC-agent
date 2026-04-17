/**
 * Discovery session routes — Mode C (public questionnaire, no auth for submit/load).
 *
 * POST /api/discover               — public — save session, return token
 * GET  /api/discover/sessions      — consultant — list sessions (ordered by created_at DESC)
 * GET  /api/discover/:token        — public — load a session by token
 * PATCH /api/discover/:token/contact — public — add/update contact info
 * POST /api/discover/:token/convert — consultant — new full audit + intake_brief seeded from discovery answers
 */
import { Router } from 'express';

import { attachProfile, requireAuth, requireRole } from '../../middleware/auth.js';
import {
  discoverAnalyticsPublicLimiter,
  discoverPublicReadLimiter,
  discoverSessionCreateLimiter,
  discoverUiFragmentReadLimiter,
} from '../../middleware/rate-limit.js';
import { getDiscoverSessionByTokenController } from './controllers/get-discover-session-by-token.controller.js';
import { getDiscoverSessionsController } from './controllers/get-discover-sessions.controller.js';
import { getDiscoverUiFragmentController } from './controllers/get-discover-ui-fragment.controller.js';
import { patchDiscoverContactController } from './controllers/patch-discover-contact.controller.js';
import { postDiscoverAnalyticsEventsController } from './controllers/post-discover-analytics-events.controller.js';
import { postDiscoverConvertController } from './controllers/post-discover-convert.controller.js';
import { postDiscoverSessionController } from './controllers/post-discover-session.controller.js';

export const discoverRouter = Router();

discoverRouter.post('/', discoverSessionCreateLimiter, postDiscoverSessionController);

// Must be registered before GET /:token so "ui-fragment" is not parsed as a token.
discoverRouter.get('/ui-fragment', discoverUiFragmentReadLimiter, getDiscoverUiFragmentController);

// Registered before GET /:token so the path is not parsed as a session token.
discoverRouter.post('/analytics-events', discoverAnalyticsPublicLimiter, postDiscoverAnalyticsEventsController);

discoverRouter.get(
  '/sessions',
  requireAuth,
  attachProfile,
  requireRole('consultant'),
  getDiscoverSessionsController,
);

discoverRouter.get('/:token', discoverPublicReadLimiter, getDiscoverSessionByTokenController);

discoverRouter.patch('/:token/contact', discoverPublicReadLimiter, patchDiscoverContactController);

discoverRouter.post(
  '/:token/convert',
  requireAuth,
  attachProfile,
  requireRole('consultant'),
  postDiscoverConvertController,
);
