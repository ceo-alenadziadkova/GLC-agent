import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_STALE_VERSION_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import { PLAN_BOARD_GOVERNANCE_BLOCKED_MESSAGE } from '../../../config/api-user-messages.en.js';
import { isOrchestrationPackApiEnabled } from '../../../config/feature-flags.js';
import { isPlanBoardOperationalReadOnlyPack } from '../../../config/plan-board-operational-policy.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { fetchPersistedGlcOrchestrationPackForUser } from '../../../services/orchestration/orchestration-read.service.js';
import { resolveAuditPlanBoardAccess } from '../../../services/plan-board/plan-board-access.js';
import { appendPlanTicketEvent } from '../../../services/plan-board/plan-ticket-activity.service.js';
import { logger } from '../../../services/logger.js';
import { supabase } from '../../../services/supabase.js';
import { PlanBoardBatchPatchSchema } from '../../../schemas/plan-board.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function patchPlanBoardCardsBatchController(req: AuthRequest, res: Response) {
  const auditId = req.params.id as string;
  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }
    const parsed = PlanBoardBatchPatchSchema.safeParse(req.body ?? {});
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
    if (persisted.orchestration_pack_version !== parsed.data.expected_pack_version) {
      sendApiError(
        res,
        409,
        API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_STALE_VERSION,
        AUDITS_ORCHESTRATION_PACK_STALE_VERSION_MESSAGE,
        { pack_version_actual: persisted.orchestration_pack_version },
      );
      return;
    }

    const rpcRows = parsed.data.patches.map((p) => ({
      card_id: p.card_id,
      ...(p.to_column !== undefined ? { to_column: p.to_column } : {}),
      ...(p.position !== undefined ? { position: p.position } : {}),
      ...(p.pinned !== undefined ? { pinned: p.pinned } : {}),
      ...(p.delivery_area !== undefined ? { delivery_area: p.delivery_area } : {}),
      ...(p.title !== undefined ? { title: p.title } : {}),
      ...(p.lane !== undefined ? { lane: p.lane } : {}),
      ...(p.ticket_description !== undefined ? { ticket_description: p.ticket_description } : {}),
      ...(p.assignee !== undefined ? { assignee: p.assignee } : {}),
      ...(p.assignee_user_id !== undefined ? { assignee_user_id: p.assignee_user_id } : {}),
      ...(p.labels !== undefined ? { labels: p.labels } : {}),
      ...(p.story_points !== undefined ? { story_points: p.story_points } : {}),
      ...(p.priority !== undefined ? { priority: p.priority } : {}),
      ...(p.start_date !== undefined ? { start_date: p.start_date } : {}),
      ...(p.due_date !== undefined ? { due_date: p.due_date } : {}),
      ...(p.end_date !== undefined ? { end_date: p.end_date } : {}),
    }));

    const { data, error } = await supabase.rpc('plan_board_batch_patch_cards', {
      p_audit_id: auditId,
      p_updated_by_user_id: req.userId!,
      p_patches: rpcRows,
    });

    if (error) {
      logger.warn('route.plan_board_batch_patch_failed', { auditId, error: error.message });
      sendApiError(res, 400, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID, error.message);
      return;
    }

    for (const row of (data ?? []) as Array<{ card_id: string }>) {
      await appendPlanTicketEvent({
        auditId,
        cardId: row.card_id,
        actorUserId: req.userId ?? null,
        action: 'batch_update',
        sourceSurface: 'api',
      });
    }

    res.json({
      ok: true,
      updated_count: (data ?? []).length,
      pack_version_used: persisted.orchestration_pack_version,
      pack_version_actual: persisted.orchestration_pack_version,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('route.plan_board_batch_patch_unhandled', { auditId, error: error.message });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
