import type { Response } from 'express';
import {
  API_ERROR_CODES,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { isOrchestrationTimelinePrimaryUxEnabled } from '../../../config/feature-flags.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { ORCHESTRATION_TELEMETRY_METRICS } from '../../../config/orchestration-telemetry-policy.js';
import { buildClientTimelineReadModel } from '../../../services/orchestration/orchestrator-timeline-read.service.js';
import { redactOrchestratorTimelineNarrativeIfDisabled } from '../../../services/orchestration/orchestrator-timeline-narrative-gate.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function getAuditTimelineController(req: AuthRequest, res: Response) {
  try {
    const auditId = req.params.id as string;
    const result = await buildClientTimelineReadModel({
      auditId,
      userId: req.userId!,
      restrictedClientView: req.userRole === 'client',
    });
    if (result.status === 'not_found') {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    if (result.status === 'error') {
      throw result.error;
    }
    if (isOrchestrationTimelinePrimaryUxEnabled()) {
      logger.info('route.audit_timeline_served', {
        component: 'audits',
        metric: ORCHESTRATION_TELEMETRY_METRICS.timelineView,
        timeline_status: result.timeline.status,
        stale_manifest: result.timeline.version.stale_manifest,
        manifest_state: result.timeline.version.manifest_state,
        roadmap_version: result.timeline.version.roadmap_version,
      });
    }
    const timeline = redactOrchestratorTimelineNarrativeIfDisabled(result.timeline, req.userEmail);
    res.json({ timeline });
  } catch (err) {
    const error = err as Error;
    logger.error('route.audit_timeline_failed', {
      component: 'audits',
      metric: ORCHESTRATION_TELEMETRY_METRICS.timelineRunFailure,
      error: error.message,
      stack: error.stack,
    });
    sendApiError(
      res,
      500,
      API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_FAILED,
      AUDITS_ORCHESTRATION_PACK_FAILED_MESSAGE,
    );
  }
}

