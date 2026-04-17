import { Router } from 'express';
import { snapshotClaimRouter } from './snapshot/claim.js';
import { snapshotCompareRouter } from './snapshot/compare.js';
import { snapshotOperatorRouter } from './snapshot/operator.js';
import { snapshotPublicRouter } from './snapshot/public.js';

/**
 * Public Snapshot Routes — no auth required for start/poll.
 *
 * POST /api/snapshot        — submit URL for free snapshot (guest httpOnly cookie + funnel row)
 * POST /api/snapshot/claim  — attach snapshot audit to authenticated user (JWT)
 * GET  /api/snapshot/quota — remaining free checks this window (same IP key as POST)
 * GET  /api/snapshot/:token — poll status / fetch result by snapshotToken
 */
export const snapshotRouter = Router();

snapshotRouter.use('/', snapshotPublicRouter);
snapshotRouter.use('/', snapshotClaimRouter);
snapshotRouter.use('/', snapshotCompareRouter);
snapshotRouter.use('/operator', snapshotOperatorRouter);
