import type { Response } from 'express';
import { z } from 'zod';

import {
  API_ERROR_CODES,
  AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_NOT_READY_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { isOrchestrationPackApiEnabled } from '../../../config/feature-flags.js';
import { AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH_MESSAGE } from '../../../config/api-user-messages.en.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  buildOrchestrationPackForAudit,
  persistGlcOrchestrationPack,
} from '../../../services/orchestration/orchestration-read.service.js';
import { RoadmapManifestMismatchError } from '../../../services/orchestration/roadmap-manifest.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

const BodySchema = z.object({
  manifest_snapshot_id: z.string().uuid(),
});

export async function postOrchestrationPackController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const auditId = req.params.id as string;
    const parsedBody = BodySchema.safeParse(req.body);
    if (!parsedBody.success) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID,
        AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID_MESSAGE,
        { detail: parsedBody.error.flatten() },
      );
      return;
    }

    const pack = await buildOrchestrationPackForAudit({
      auditId,
      userId: req.userId!,
      manifestSnapshotId: parsedBody.data.manifest_snapshot_id,
    });

    if (!pack) {
      sendApiError(
        res,
        409,
        API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_NOT_READY,
        AUDITS_ORCHESTRATION_PACK_NOT_READY_MESSAGE,
      );
      return;
    }

    const { orchestration_pack_version, error: persistErr } = await persistGlcOrchestrationPack({
      auditId,
      userId: req.userId!,
      pack,
    });
    if (persistErr) {
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED, AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE);
      return;
    }

    res.json({ pack, orchestration_pack_version });
  } catch (err) {
    if (err instanceof RoadmapManifestMismatchError) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH,
        AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH_MESSAGE,
      );
      return;
    }
    const error = err as Error;
    logger.error('route.orchestration_pack_failed', {
      component: 'audits',
      error: error.message,
      stack: error.stack,
    });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED, AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE);
  }
}
