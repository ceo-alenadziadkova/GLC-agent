import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import {
  getOrchestrationPlanGovernanceRolloutMode,
  isConsultantOrchestrationCockpitEnabled,
  isOrchestrationPackApiEnabled,
} from '../../../config/feature-flags.js';
import { ORCHESTRATION_TELEMETRY_METRICS } from '../../../config/orchestration-telemetry-policy.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { fetchPersistedGlcOrchestrationPackForUser } from '../../../services/orchestration/orchestration-read.service.js';
import { evaluateOrchestrationPlanGovernance } from '../../../services/orchestration/orchestration-plan-governance.service.js';
import { summarizeOrchestrationPackRevisionDiff } from '../../../services/orchestration/orchestration-pack-diff.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function getOrchestrationPackController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const auditId = req.params.id as string;
    const result = await fetchPersistedGlcOrchestrationPackForUser({
      auditId,
      userId: req.userId!,
    });

    if (result.status === 'not_found') {
      logger.warn('route.orchestration_pack_get_rejected', {
        component: 'audits',
        reason: 'audit_not_found',
        metric: 'orchestration_pack_get.not_found',
      });
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    if (result.status === 'error') {
      logger.error('route.orchestration_pack_get_failed', {
        component: 'audits',
        error: result.error.message,
      });
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }

    logger.info('route.orchestration_pack_get_success', {
      component: 'audits',
      metric: 'orchestration_pack_get.success',
      roadmap_version: result.orchestration_pack_version,
      has_pack: result.pack !== null,
      nodes_count: result.pack?.graph.nodes.length ?? 0,
    });
    const plan_governance = result.pack
      ? evaluateOrchestrationPlanGovernance(result.pack, {
          rolloutMode: getOrchestrationPlanGovernanceRolloutMode(),
        })
      : null;
    const last_revision_diff_summary = summarizeOrchestrationPackRevisionDiff(result.last_revision_diff);
    const etag = `"orchestration-pack-v${result.orchestration_pack_version}"`;
    const inm = req.headers?.['if-none-match'];
    if (inm === etag) {
      res.status(304).end();
      return;
    }
    res.setHeader('ETag', etag);
    if (req.userRole === 'consultant' && isConsultantOrchestrationCockpitEnabled()) {
      logger.info('route.orchestration_consultant_cockpit_view', {
        component: 'audits',
        audit_id: auditId,
        metric: ORCHESTRATION_TELEMETRY_METRICS.consultantCockpitView,
      });
    }
    res.json({
      pack: result.pack,
      orchestration_pack_version: result.orchestration_pack_version,
      roadmap_version: result.orchestration_pack_version,
      last_revision_diff: result.last_revision_diff,
      last_revision_diff_summary,
      revision_history: result.revision_history,
      plan_governance,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('route.orchestration_pack_get_failed', {
      component: 'audits',
      error: error.message,
      stack: error.stack,
    });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
