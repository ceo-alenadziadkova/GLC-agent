import type { Response } from 'express';

import { API_ERROR_CODES } from '../../../config/api-error-codes.js';
import {
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_EXECUTION_PLAN_MISMATCH_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_PAYLOAD_INVALID_MESSAGE,
  AUDITS_ROADMAP_MANIFEST_PREVIEW_FAILED_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-user-messages.en.js';
import { isOrchestrationPackApiEnabled } from '../../../config/feature-flags.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { RoadmapManifestPayloadSchema } from '../../../schemas/roadmap-manifest.js';
import {
  assertManifestMatchesExecutionPlan,
  RoadmapManifestMismatchError,
} from '../../../services/orchestration/roadmap-manifest.service.js';
import { buildRoadmapManifestPreview } from '../../../services/orchestration/roadmap-manifest-preview.js';
import { loadAuditExecutionPlanRow } from '../../../services/orchestration/orchestration-read.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function postRoadmapManifestPreviewController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const auditId = req.params.id as string;
    const parsedBody = RoadmapManifestPayloadSchema.safeParse(req.body);
    if (!parsedBody.success) {
      logger.warn('route.roadmap_manifest_preview_rejected', {
        component: 'audits',
        reason: 'payload_invalid',
        metric: 'roadmap_manifest_preview.validation_fail',
      });
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
      logger.warn('route.roadmap_manifest_preview_rejected', {
        component: 'audits',
        reason: 'audit_not_found',
        metric: 'roadmap_manifest_preview.audit_not_found',
      });
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    try {
      assertManifestMatchesExecutionPlan(parsedBody.data, auditCtx.plan);
    } catch (e) {
      if (e instanceof RoadmapManifestMismatchError) {
        logger.warn('route.roadmap_manifest_preview_rejected', {
          component: 'audits',
          reason: 'manifest_execution_plan_mismatch',
          metric: 'roadmap_manifest_preview.mismatch',
        });
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

    const preview = buildRoadmapManifestPreview({
      manifest: parsedBody.data,
      executionPlan: auditCtx.plan,
    });
    logger.info('route.roadmap_manifest_preview_success', {
      component: 'audits',
      metric: 'roadmap_manifest_preview.success',
      selected_domains_count: parsedBody.data.selected_domains.length,
      lanes_included_count: preview.lanes_included.length,
      waiting_list_count: preview.waiting_list_domains.length,
      kpi_manifest_preview_confirm_intent: 1,
    });
    res.json({ preview });
  } catch (err) {
    const error = err as Error;
    logger.error('route.roadmap_manifest_preview_failed', {
      component: 'audits',
      error: error.message,
      stack: error.stack,
    });
    sendApiError(
      res,
      500,
      API_ERROR_CODES.AUDITS_ROADMAP_MANIFEST_PREVIEW_FAILED,
      AUDITS_ROADMAP_MANIFEST_PREVIEW_FAILED_MESSAGE,
    );
  }
}
