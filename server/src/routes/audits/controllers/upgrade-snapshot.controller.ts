import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { upgradeFreeSnapshotAudit } from '../../../lib/upgrade-free-snapshot-audit.js';
import {
  API_ERROR_CODES,
  AUDITS_UPGRADE_FAILED_MESSAGE,
  AUDITS_UPGRADE_PAYLOAD_INVALID_MESSAGE,
} from '../../../config/api-error-codes.js';
import { logger } from '../../../services/logger.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';
import { upgradeFromSnapshotBodySchema } from '../validators/audits-route-input.validator.js';

export async function upgradeFromSnapshotController(req: AuthRequest, res: Response) {
  try {
    const parsed = upgradeFromSnapshotBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_UPGRADE_PAYLOAD_INVALID,
        AUDITS_UPGRADE_PAYLOAD_INVALID_MESSAGE,
      );
      return;
    }

    const result = await upgradeFreeSnapshotAudit({
      auditId: req.params.id as string,
      actorUserId: req.userId!,
      coveragePackage: parsed.data.coverage_package,
      useScrapedContext: parsed.data.use_scraped_context,
    });
    if (!result.ok) {
      sendApiError(res, result.status, result.code, result.error);
      return;
    }
    res.json(result);
  } catch (err) {
    const error = err as Error;
    logger.error('route.upgrade_snapshot_failed', { component: 'audits', error: error.message, stack: error.stack });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_UPGRADE_FAILED, AUDITS_UPGRADE_FAILED_MESSAGE);
  }
}
