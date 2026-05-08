import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_ACCESS_DENIED_MESSAGE,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_STALE_VERSION_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { isOrchestrationPackApiEnabled } from '../../../config/feature-flags.js';
import { isPlanBoardOperationalReadOnlyPack } from '../../../config/plan-board-operational-policy.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { fetchPersistedGlcOrchestrationPackForUser } from '../../../services/orchestration/orchestration-read.service.js';
import { resolveAuditPlanBoardAccess } from '../../../services/plan-board/plan-board-access.js';
import { appendPlanTicketEvent } from '../../../services/plan-board/plan-ticket-activity.service.js';
import { logger } from '../../../services/logger.js';
import { supabase } from '../../../services/supabase.js';
import { PlanBoardCardDeleteSchema } from '../../../schemas/plan-board.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function deletePlanBoardCardController(req: AuthRequest, res: Response) {
  const auditId = req.params.id as string;
  const cardId = req.params.cardId as string;
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const parsed = PlanBoardCardDeleteSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      sendApiError(res, 400, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID, 'invalid_body');
      return;
    }

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
    if (access.kind === 'client') {
      sendApiError(res, 403, API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE);
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
      sendApiError(res, 409, API_ERROR_CODES.PLAN_BOARD_GOVERNANCE_BLOCKED, 'governance_blocked');
      return;
    }
    if (persisted.orchestration_pack_version !== parsed.data.expected_pack_version) {
      sendApiError(res, 409, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_STALE_VERSION, AUDITS_ORCHESTRATION_PACK_STALE_VERSION_MESSAGE, {
        pack_version_actual: persisted.orchestration_pack_version,
      });
      return;
    }

    const { error } = await supabase.from('plan_task_delivery').delete().eq('audit_id', auditId).eq('id', cardId);
    if (error) {
      logger.error('route.plan_board_delete_failed', { auditId, cardId, error: error.message });
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }

    await appendPlanTicketEvent({
      auditId,
      cardId,
      actorUserId: req.userId ?? null,
      action: 'delete',
      sourceSurface: 'board',
    });

    res.json({ ok: true, pack_version_used: persisted.orchestration_pack_version });
  } catch (err) {
    const error = err as Error;
    logger.error('route.plan_board_delete_unhandled', { auditId, cardId, error: error.message });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
