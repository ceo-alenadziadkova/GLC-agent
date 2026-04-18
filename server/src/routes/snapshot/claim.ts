import { Router } from 'express';
import type { AuthRequest } from '../../middleware/auth.js';
import { requireAuth } from '../../middleware/auth.js';
import { logger } from '../../services/logger.js';
import {
  API_ERROR_CODES,
  SNAPSHOT_CLAIM_FAILED_MESSAGE,
  apiErrorJson,
} from '../../config/api-error-codes.js';
import { claimSnapshotForUser } from '../../snapshot/services/snapshot-claim.service.js';
import { parseSnapshotToken } from '../../snapshot/validators/snapshot-token-validator.js';
import { claimSnapshotBodySchema } from './validators/snapshot-route-input.validator.js';
import {
  sendClaimSnapshotResult,
  sendSnapshotTokenRequired,
} from './mappers/snapshot-http.mapper.js';

export const snapshotClaimRouter = Router();

snapshotClaimRouter.post('/claim', requireAuth, async (req: AuthRequest, res) => {
  try {
    const parsedBody = claimSnapshotBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      sendSnapshotTokenRequired(res);
      return;
    }

    const snapshotToken = parseSnapshotToken(parsedBody.data.snapshot_token);
    if (!snapshotToken) {
      sendSnapshotTokenRequired(res);
      return;
    }

    const result = await claimSnapshotForUser(snapshotToken, req.userId!);
    sendClaimSnapshotResult(res, result);
  } catch (err) {
    const e = err as Error;
    logger.error('snapshot.claim_exception', { component: 'snapshot', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_CLAIM_FAILED, SNAPSHOT_CLAIM_FAILED_MESSAGE));
  }
});
