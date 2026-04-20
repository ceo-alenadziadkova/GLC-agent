import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import {
  getOrchestrationPlanGovernanceRolloutMode,
  isOrchestrationPackApiEnabled,
} from '../../../config/feature-flags.js';
import {
  ORCHESTRATION_PACK_DIFF_HISTORY_LIST_DEFAULT_LIMIT,
  ORCHESTRATION_PACK_DIFF_HISTORY_LIST_MAX_LIMIT,
  ORCHESTRATION_PACK_DIFF_HISTORY_LIST_MIN_LIMIT,
} from '../../../config/route-query-limits.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import {
  fetchOrchestrationPackRevisionHistoryForUser,
  fetchPersistedGlcOrchestrationPackForUser,
} from '../../../services/orchestration/orchestration-read.service.js';
import { evaluateOrchestrationPlanGovernance } from '../../../services/orchestration/orchestration-plan-governance.service.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

function parseLimit(raw: unknown): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isFinite(n)) {
    return ORCHESTRATION_PACK_DIFF_HISTORY_LIST_DEFAULT_LIMIT;
  }
  return Math.min(
    ORCHESTRATION_PACK_DIFF_HISTORY_LIST_MAX_LIMIT,
    Math.max(ORCHESTRATION_PACK_DIFF_HISTORY_LIST_MIN_LIMIT, n),
  );
}

export async function getOrchestrationPackDiffHistoryController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }
    const auditId = req.params.id as string;
    const limit = parseLimit(req.query['limit']);
    const result = await fetchOrchestrationPackRevisionHistoryForUser({
      auditId,
      userId: req.userId!,
      limit,
    });
    if (result.status === 'not_found') {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    if (result.status === 'error') {
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }
    logger.info('route.orchestration_pack_diff_history_success', {
      component: 'audits',
      metric: 'orchestration_pack_diff_history.success',
      count: result.items.length,
      limit,
    });
    const persisted = await fetchPersistedGlcOrchestrationPackForUser({
      auditId,
      userId: req.userId!,
    });
    const latest_plan_governance =
      persisted.status === 'ok' && persisted.pack
        ? evaluateOrchestrationPlanGovernance(persisted.pack, {
            rolloutMode: getOrchestrationPlanGovernanceRolloutMode(),
          })
        : null;
    res.json({ items: result.items, latest_plan_governance });
  } catch (err) {
    const error = err as Error;
    logger.error('route.orchestration_pack_diff_history_failed', {
      component: 'audits',
      error: error.message,
      stack: error.stack,
    });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
