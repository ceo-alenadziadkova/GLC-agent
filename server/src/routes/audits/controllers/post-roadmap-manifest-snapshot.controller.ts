import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_SNAPSHOT_FAILED_MESSAGE,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { RoadmapManifestPayloadSchema } from '../../../schemas/roadmap-manifest.js';
import {
  assertManifestMatchesExecutionPlan,
  insertRoadmapManifestSnapshot,
  RoadmapManifestMismatchError,
} from '../../../services/orchestration/roadmap-manifest.service.js';
import { loadAuditExecutionPlanRow } from '../../../services/orchestration/orchestration-read.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function postRoadmapManifestSnapshotController(req: AuthRequest, res: Response) {
  try {
    const auditId = req.params.id as string;
    const parsedBody = RoadmapManifestPayloadSchema.safeParse(req.body);
    if (!parsedBody.success) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID,
        AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID_MESSAGE,
        { detail: parsedBody.error.flatten() },
      );
      return;
    }

    const auditCtx = await loadAuditExecutionPlanRow(auditId, req.userId!);
    if (!auditCtx) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    try {
      assertManifestMatchesExecutionPlan(parsedBody.data, auditCtx.plan);
    } catch (e) {
      if (e instanceof RoadmapManifestMismatchError) {
        sendApiError(
          res,
          400,
          API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH,
          AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH_MESSAGE,
        );
        return;
      }
      throw e;
    }

    const { id } = await insertRoadmapManifestSnapshot({
      auditId,
      userId: req.userId!,
      payload: parsedBody.data,
    });
    res.status(201).json({ id });
  } catch (err) {
    const error = err as Error;
    logger.error('route.roadmap_manifest_snapshot_failed', {
      component: 'audits',
      error: error.message,
      stack: error.stack,
    });
    sendApiError(
      res,
      500,
      API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_SNAPSHOT_FAILED,
      AUDITS_ROADMAP_MANIFEST_SNAPSHOT_FAILED_MESSAGE,
    );
  }
}
