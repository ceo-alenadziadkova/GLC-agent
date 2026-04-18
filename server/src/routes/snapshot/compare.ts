import { Router } from 'express';
import { ensureHttpsUrl } from '@glc/intake-core';
import type { AuthRequest } from '../../middleware/auth.js';
import { requireAuth } from '../../middleware/auth.js';
import { snapshotCompareLimiter } from '../../middleware/rate-limit.js';
import {
  API_ERROR_CODES,
  SNAPSHOT_COMPARE_COMPETITOR_URL_REQUIRED_MESSAGE,
  SNAPSHOT_COMPARE_FAILED_MESSAGE,
  SNAPSHOT_COMPARE_SELF_URL_REQUIRED_MESSAGE,
  apiErrorJson,
} from '../../config/api-error-codes.js';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../../lib/public-http-url.js';
import { compareSiteMetricsByUrl } from '../../lib/snapshot-competitor.js';
import { SNAPSHOT_COMPETITOR_TIMEOUT_MS } from '../../config/snapshot-public.js';
import { logger } from '../../services/logger.js';
import { compareSnapshotBodySchema } from './validators/snapshot-route-input.validator.js';

export const snapshotCompareRouter = Router();

snapshotCompareRouter.post('/compare', requireAuth, snapshotCompareLimiter, async (req: AuthRequest, res) => {
  try {
    const parsedBody = compareSnapshotBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      const missingSelf = typeof req.body?.self_url !== 'string' || req.body.self_url.trim().length === 0;
      if (missingSelf) {
        res
          .status(400)
          .json(
            apiErrorJson(
              API_ERROR_CODES.SNAPSHOT_COMPARE_SELF_URL_REQUIRED,
              SNAPSHOT_COMPARE_SELF_URL_REQUIRED_MESSAGE,
            ),
          );
        return;
      }
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.SNAPSHOT_COMPARE_COMPETITOR_URL_REQUIRED,
            SNAPSHOT_COMPARE_COMPETITOR_URL_REQUIRED_MESSAGE,
          ),
        );
      return;
    }

    const selfUrl = await validatePublicAuditUrl(ensureHttpsUrl(parsedBody.data.self_url));
    const competitorUrl = await validatePublicAuditUrl(ensureHttpsUrl(parsedBody.data.competitor_url));
    const competitorMini = await compareSiteMetricsByUrl({
      selfUrl,
      competitorUrl,
      timeoutMs: SNAPSHOT_COMPETITOR_TIMEOUT_MS,
    });

    res.json({
      competitor_mini: competitorMini ?? null,
    });
  } catch (err) {
    if (err instanceof PublicUrlNotAllowedError) {
      res.status(400).json(apiErrorJson(err.code, err.message));
      return;
    }
    const e = err as Error;
    logger.error('snapshot.compare_exception', {
      component: 'snapshot',
      user_id: req.userId,
      error: e.message,
      stack: e.stack,
    });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.SNAPSHOT_COMPARE_FAILED, SNAPSHOT_COMPARE_FAILED_MESSAGE));
  }
});
