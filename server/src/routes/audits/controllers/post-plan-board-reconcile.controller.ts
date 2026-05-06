import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { PLAN_BOARD_GOVERNANCE_BLOCKED_MESSAGE } from '../../../config/api-user-messages.en.js';
import { isOrchestrationPackApiEnabled } from '../../../config/feature-flags.js';
import { isPlanBoardOperationalReadOnlyPack } from '../../../config/plan-board-operational-policy.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { fetchPersistedGlcOrchestrationPackForUser } from '../../../services/orchestration/orchestration-read.service.js';
import { resolveAuditPlanBoardAccess } from '../../../services/plan-board/plan-board-access.js';
import { runPlanBoardReconcileAfterPackPersist } from '../../../services/plan-board/reconcile-pack.service.js';
import { logger } from '../../../services/logger.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function postPlanBoardReconcileController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const auditId = req.params.id as string;
    const access = await resolveAuditPlanBoardAccess({ auditId, userId: req.userId!, userRole: req.userRole });
    if (!access.ok) {
      sendApiError(
        res,
        access.reason === 'denied' ? 403 : 404,
        API_ERROR_CODES.AUDITS_NOT_FOUND,
        AUDITS_NOT_FOUND_MESSAGE,
      );
      return;
    }
    if (access.kind !== 'consultant_owner' && access.kind !== 'platform_admin') {
      sendApiError(res, 403, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    const persisted = await fetchPersistedGlcOrchestrationPackForUser({
      auditId,
      userId: req.userId!,
    });
    if (persisted.status !== 'ok' || !persisted.pack) {
      sendApiError(res, 409, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_NOT_READY, 'no_pack');
      return;
    }
    if (isPlanBoardOperationalReadOnlyPack(persisted.pack)) {
      sendApiError(res, 409, API_ERROR_CODES.PLAN_BOARD_GOVERNANCE_BLOCKED, PLAN_BOARD_GOVERNANCE_BLOCKED_MESSAGE, {
        code: 'governance_blocked',
      });
      return;
    }

    await runPlanBoardReconcileAfterPackPersist({
      auditId,
      consultantUserId: req.userId!,
      pack: persisted.pack,
      orchestration_pack_version: persisted.orchestration_pack_version,
    });

    res.json({ ok: true, orchestration_pack_version: persisted.orchestration_pack_version });
  } catch (err) {
    const error = err as Error;
    logger.error('route.plan_board_reconcile_unhandled', { error: error.message });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
