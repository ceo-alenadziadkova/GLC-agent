import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_LIST_FAILED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { ORCHESTRATION_PACK_API_DISABLED_MESSAGE } from '../../../config/api-user-messages.en.js';
import { isOrchestrationPackApiEnabled } from '../../../config/feature-flags.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { loadAuditExecutionPlanRow } from '../../../services/orchestration/orchestration-read.service.js';
import {
  fetchLatestRoadmapManifestSnapshotIdForAudit,
  fetchRoadmapManifestSnapshotForAudit,
} from '../../../services/orchestration/roadmap-manifest.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function getRoadmapManifestSnapshotLatestController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const auditId = req.params.id as string;
    const auditCtx = await loadAuditExecutionPlanRow(auditId, req.userId!);
    if (!auditCtx) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    const latest = await fetchLatestRoadmapManifestSnapshotIdForAudit({ auditId });
    if (!latest) {
      res.json({ snapshot: null });
      return;
    }

    const snapshot = await fetchRoadmapManifestSnapshotForAudit({
      auditId,
      snapshotId: latest.id,
    });
    if (!snapshot) {
      logger.warn('route.roadmap_manifest_latest_missing_after_id_lookup', {
        component: 'audits',
        auditId,
      });
      res.json({ snapshot: null });
      return;
    }

    res.json({ snapshot });
  } catch (err) {
    const error = err as Error;
    logger.error('route.roadmap_manifest_latest_failed', {
      component: 'audits',
      error: error.message,
      stack: error.stack,
    });
    sendApiError(
      res,
      500,
      API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_LIST_FAILED,
      AUDITS_ROADMAP_MANIFEST_LIST_FAILED_MESSAGE,
    );
  }
}
