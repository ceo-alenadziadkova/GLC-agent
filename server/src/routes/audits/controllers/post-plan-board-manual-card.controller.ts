import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import {
  PLAN_BOARD_GOVERNANCE_BLOCKED_MESSAGE,
  PLAN_BOARD_MANUAL_IN_PROGRESS_BLOCKED_MESSAGE,
} from '../../../config/api-user-messages.en.js';
import { isOrchestrationPackApiEnabled, isPlanBoardStrictManualInProgressBlocked } from '../../../config/feature-flags.js';
import { isPlanBoardOperationalReadOnlyPack } from '../../../config/plan-board-operational-policy.js';
import { PLAN_BOARD_COLUMN_DEFAULT_IDS } from '../../../config/plan-board-columns.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { fetchPersistedGlcOrchestrationPackForUser } from '../../../services/orchestration/orchestration-read.service.js';
import { resolveAuditPlanBoardAccess } from '../../../services/plan-board/plan-board-access.js';
import { logger } from '../../../services/logger.js';
import { supabase } from '../../../services/supabase.js';
import { PlanBoardManualCardPostSchema } from '../../../schemas/plan-board.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function postPlanBoardManualCardController(req: AuthRequest, res: Response) {
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const parsed = PlanBoardManualCardPostSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      sendApiError(res, 400, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID, 'invalid_body');
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

    const column = parsed.data.column_id ?? PLAN_BOARD_COLUMN_DEFAULT_IDS.backlog;

    if (
      isPlanBoardStrictManualInProgressBlocked() &&
      column === PLAN_BOARD_COLUMN_DEFAULT_IDS.in_progress
    ) {
      sendApiError(res, 409, API_ERROR_CODES.PLAN_BOARD_MANUAL_IN_PROGRESS_BLOCKED, PLAN_BOARD_MANUAL_IN_PROGRESS_BLOCKED_MESSAGE, {
        code: 'manual_in_progress_blocked',
      });
      return;
    }

    const positionBase = Date.now();

    const { data: inserted, error: insErr } = await supabase
      .from('plan_task_delivery')
      .insert({
        audit_id: auditId,
        canonical_node_key: null,
        pack_graph_node_id: null,
        pack_lane_snapshot: parsed.data.lane,
        manual_title: parsed.data.title,
        source: 'manual',
        delivery_area: column === PLAN_BOARD_COLUMN_DEFAULT_IDS.backlog ? 'backlog' : 'board',
        column_id: column,
        position: positionBase,
        pinned: false,
        created_by_user_id: req.userId!,
      })
      .select('id')
      .single();

    if (insErr || !inserted?.id) {
      logger.error('route.plan_board_manual_insert_failed', { auditId, error: insErr?.message });
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }

    res.status(201).json({
      card_id: inserted.id,
      pack_version_used: persisted.orchestration_pack_version,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('route.plan_board_manual_unhandled', { error: error.message });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
