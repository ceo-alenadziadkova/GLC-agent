import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_LIST_FAILED_MESSAGE,
} from '../../../config/api-error-codes.js';
import {
  ORCHESTRATION_ROADMAP_MANIFEST_SNAPSHOTS_LIST_DEFAULT_LIMIT,
  ORCHESTRATION_ROADMAP_MANIFEST_SNAPSHOTS_LIST_MAX_LIMIT,
  ORCHESTRATION_ROADMAP_MANIFEST_SNAPSHOTS_LIST_MIN_LIMIT,
} from '../../../config/route-query-limits.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { loadAuditExecutionPlanRow } from '../../../services/orchestration/orchestration-read.service.js';
import { listRoadmapManifestSnapshotsForAudit } from '../../../services/orchestration/roadmap-manifest.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

function parseManifestSnapshotsLimit(raw: unknown): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(n)) {
    return ORCHESTRATION_ROADMAP_MANIFEST_SNAPSHOTS_LIST_DEFAULT_LIMIT;
  }
  return Math.min(
    ORCHESTRATION_ROADMAP_MANIFEST_SNAPSHOTS_LIST_MAX_LIMIT,
    Math.max(ORCHESTRATION_ROADMAP_MANIFEST_SNAPSHOTS_LIST_MIN_LIMIT, n),
  );
}

export async function getRoadmapManifestSnapshotsController(req: AuthRequest, res: Response) {
  try {
    const auditId = req.params.id as string;
    const auditCtx = await loadAuditExecutionPlanRow(auditId, req.userId!);
    if (!auditCtx) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    const limit = parseManifestSnapshotsLimit(req.query['limit']);
    const { snapshots, error } = await listRoadmapManifestSnapshotsForAudit({ auditId, limit });
    if (error) {
      logger.error('route.roadmap_manifest_list_failed', {
        component: 'audits',
        error: error.message,
      });
      sendApiError(
        res,
        500,
        API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_LIST_FAILED,
        AUDITS_ROADMAP_MANIFEST_LIST_FAILED_MESSAGE,
      );
      return;
    }

    res.json({ snapshots });
  } catch (err) {
    const error = err as Error;
    logger.error('route.roadmap_manifest_list_failed', {
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
