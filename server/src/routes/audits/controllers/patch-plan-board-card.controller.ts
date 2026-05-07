import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_ORCHESTRATION_PACK_STALE_VERSION_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import {
  AUDITS_ACCESS_DENIED_MESSAGE,
  IDEMPOTENCY_KEY_REQUIRED_MESSAGE,
  IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE,
  PLAN_BOARD_GOVERNANCE_BLOCKED_MESSAGE,
  PLAN_BOARD_LANE_MANIFEST_DRAFT_REQUIRED_MESSAGE,
  PLAN_BOARD_MANUAL_IN_PROGRESS_BLOCKED_MESSAGE,
} from '../../../config/api-user-messages.en.js';
import { idempotencyPatchAuditsPlanBoardCardKey } from '../../../config/api-http-paths.js';
import {
  isManifestDraftRevisionsFromBoardEnabled,
  isOrchestrationPackApiEnabled,
  isPlanBoardCustomColumnsFeatureEnabled,
  isPlanBoardStrictManualInProgressBlocked,
} from '../../../config/feature-flags.js';
import {
  isPlanBoardOperationalReadOnlyPack,
  shouldBlockManualCardEnteringOperationalInProgress,
} from '../../../config/plan-board-operational-policy.js';
import { parsePlanBoardTransitionBySemantics } from '../../../config/plan-board-transitions.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { fetchPersistedGlcOrchestrationPackForUser } from '../../../services/orchestration/orchestration-read.service.js';
import { getStoredIdempotentResponse, isIdempotencyPayloadConflictError, storeIdempotentResponse } from '../../../lib/idempotency.js';
import { resolveAuditPlanBoardAccess } from '../../../services/plan-board/plan-board-access.js';
import {
  buildDefaultResolvedPlanBoardPolicy,
  resolvePlanBoardPolicyForAuditId,
  semanticForColumnId,
} from '../../../services/plan-board/plan-board-column-policy.service.js';
import { isPlanBoardCardRowVisibleToClient } from '../../../services/plan-board/plan-board-client-view.js';
import {
  countPinnedPlanBoardCards,
  emitPlanBoardCardMoved,
  emitPlanBoardCardPinned,
  emitPlanBoardConflict409,
  emitPlanBoardManualInProgressBlocked,
} from '../../../services/plan-board/plan-board-pipeline-events.js';
import { appendPlanTicketEvent } from '../../../services/plan-board/plan-ticket-activity.service.js';
import { logger } from '../../../services/logger.js';
import { supabase } from '../../../services/supabase.js';
import { PlanBoardCardPatchSchema } from '../../../schemas/plan-board.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function patchPlanBoardCardController(req: AuthRequest, res: Response) {
  const auditId = req.params.id as string;
  const cardId = req.params.cardId as string;

  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const parsed = PlanBoardCardPatchSchema.safeParse(req.body ?? {});
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

    const idempotencyRoute = idempotencyPatchAuditsPlanBoardCardKey(auditId, cardId);
    let idempotent: Awaited<ReturnType<typeof getStoredIdempotentResponse>>;
    try {
      idempotent = await getStoredIdempotentResponse(req, idempotencyRoute, parsed.data);
    } catch (idempErr) {
      if (isIdempotencyPayloadConflictError(idempErr)) {
        void emitPlanBoardConflict409({
          auditId,
          payload: {
            reason: 'idempotency_mismatch',
            pack_version_seen: parsed.data.expected_pack_version,
            pack_version_actual: null,
          },
        });
        sendApiError(
          res,
          409,
          API_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH,
          IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE,
        );
        return;
      }
      throw idempErr;
    }
    if (!idempotent.key) {
      sendApiError(res, 400, API_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED, IDEMPOTENCY_KEY_REQUIRED_MESSAGE);
      return;
    }
    if (idempotent.replay) {
      res.status(idempotent.replay.statusCode).json(idempotent.replay.payload);
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
      void emitPlanBoardConflict409({
        auditId,
        payload: {
          reason: 'governance_blocked',
          pack_version_seen: parsed.data.expected_pack_version,
          pack_version_actual: persisted.orchestration_pack_version,
        },
      });
      sendApiError(res, 409, API_ERROR_CODES.PLAN_BOARD_GOVERNANCE_BLOCKED, PLAN_BOARD_GOVERNANCE_BLOCKED_MESSAGE, {
        code: 'governance_blocked',
        pack_version_actual: persisted.orchestration_pack_version,
      });
      return;
    }
    if (persisted.orchestration_pack_version !== parsed.data.expected_pack_version) {
      void emitPlanBoardConflict409({
        auditId,
        payload: {
          reason: 'stale_pack_version',
          pack_version_seen: parsed.data.expected_pack_version,
          pack_version_actual: persisted.orchestration_pack_version,
        },
      });
      sendApiError(res, 409, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_STALE_VERSION, AUDITS_ORCHESTRATION_PACK_STALE_VERSION_MESSAGE, {
        pack_version_actual: persisted.orchestration_pack_version,
      });
      return;
    }

    const { data: cardRow, error: cardErr } = await supabase
      .from('plan_task_delivery')
      .select('id, column_id, source, delivery_area')
      .eq('audit_id', auditId)
      .eq('id', cardId)
      .maybeSingle();
    if (cardErr || !cardRow) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    const policyCtx = await resolvePlanBoardPolicyForAuditId({
      auditId,
      featureEnabled: isPlanBoardCustomColumnsFeatureEnabled(),
    });
    const resolved = policyCtx?.resolved ?? buildDefaultResolvedPlanBoardPolicy();
    const allowedColumnIds = new Set(resolved.allowedColumnIds);

    const role = req.userRole === 'client' ? 'client' : 'consultant';

    if (
      role === 'client' &&
      !isPlanBoardCardRowVisibleToClient(
        {
          source: cardRow.source as string,
          column_id: cardRow.column_id as string,
          delivery_area: cardRow.delivery_area as string,
        },
        resolved.clientVisibleColumnIds,
      )
    ) {
      sendApiError(res, 403, API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE);
      return;
    }

    if (
      role === 'client'
      && (
        parsed.data.delivery_area != null
        || parsed.data.title != null
        || parsed.data.lane != null
        || parsed.data.ticket_description != null
        || parsed.data.assignee != null
        || parsed.data.assignee_user_id != null
        || parsed.data.labels != null
        || parsed.data.story_points != null
        || parsed.data.priority != null
        || parsed.data.start_date != null
        || parsed.data.due_date != null
        || parsed.data.end_date != null
      )
    ) {
      sendApiError(res, 403, API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE);
      return;
    }

    if (isManifestDraftRevisionsFromBoardEnabled() && parsed.data.lane != null) {
      sendApiError(
        res,
        409,
        API_ERROR_CODES.PLAN_BOARD_LANE_MANIFEST_DRAFT_REQUIRED,
        PLAN_BOARD_LANE_MANIFEST_DRAFT_REQUIRED_MESSAGE,
        {
          code: 'lane_requires_manifest_draft',
        },
      );
      return;
    }

    if (parsed.data.to_column != null && !allowedColumnIds.has(parsed.data.to_column)) {
      sendApiError(res, 400, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID, 'invalid_column');
      return;
    }

    if (parsed.data.to_column != null && parsed.data.to_column !== (cardRow.column_id as string)) {
      const fromSem = semanticForColumnId(resolved, cardRow.column_id as string);
      const toSem = semanticForColumnId(resolved, parsed.data.to_column);
      if (
        shouldBlockManualCardEnteringOperationalInProgress({
          strictEnabled: isPlanBoardStrictManualInProgressBlocked(),
          source: cardRow.source as string,
          currentSemantic: fromSem,
          requestedToSemantic: toSem,
        })
      ) {
        void emitPlanBoardManualInProgressBlocked({ auditId });
        sendApiError(res, 409, API_ERROR_CODES.PLAN_BOARD_MANUAL_IN_PROGRESS_BLOCKED, PLAN_BOARD_MANUAL_IN_PROGRESS_BLOCKED_MESSAGE, {
          code: 'manual_in_progress_blocked',
          pack_version_actual: persisted.orchestration_pack_version,
        });
        return;
      }
      if (!parsePlanBoardTransitionBySemantics(role, fromSem, toSem)) {
        sendApiError(res, 403, API_ERROR_CODES.AUDITS_NOT_FOUND, 'transition_not_allowed');
        return;
      }
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (parsed.data.to_column != null) patch.column_id = parsed.data.to_column;
    if (parsed.data.position != null) patch.position = parsed.data.position;
    if (parsed.data.pinned != null) patch.pinned = parsed.data.pinned;
    if (parsed.data.delivery_area != null) patch.delivery_area = parsed.data.delivery_area;
    if (parsed.data.title != null) patch.manual_title = parsed.data.title;
    if (parsed.data.lane != null) patch.pack_lane_snapshot = parsed.data.lane;
    if (parsed.data.ticket_description != null) patch.ticket_description = parsed.data.ticket_description;
    if (parsed.data.assignee != null) patch.assignee = parsed.data.assignee;
    if (parsed.data.assignee_user_id !== undefined) patch.assignee_user_id = parsed.data.assignee_user_id;
    if (parsed.data.labels != null) patch.labels = parsed.data.labels;
    if (parsed.data.story_points !== undefined) patch.story_points = parsed.data.story_points;
    if (parsed.data.priority != null) patch.priority = parsed.data.priority;
    if (parsed.data.start_date != null) patch.start_date = parsed.data.start_date;
    if (parsed.data.due_date != null) patch.due_date = parsed.data.due_date;
    if (parsed.data.end_date != null) patch.end_date = parsed.data.end_date;
    patch.updated_by_user_id = req.userId!;

    const { error: writeErr } = await supabase.from('plan_task_delivery').update(patch).eq('audit_id', auditId).eq('id', cardId);
    if (writeErr) {
      logger.error('route.plan_board_patch_failed', { auditId, cardId, error: writeErr.message });
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }

    const fromCol = cardRow.column_id as string;
    const destCol = (parsed.data.to_column ?? cardRow.column_id) as string;
    if (parsed.data.to_column != null || parsed.data.position != null) {
      void emitPlanBoardCardMoved({
        auditId,
        payload: {
          role,
          from_column: fromCol,
          to_column: destCol,
          card_source: cardRow.source as string,
        },
      });
    }

    if (parsed.data.pinned != null) {
      const pinnedCount = await countPinnedPlanBoardCards(auditId);
      void emitPlanBoardCardPinned({
        auditId,
        payload: {
          role,
          pinned_count_after: pinnedCount,
        },
      });
    }

    await appendPlanTicketEvent({
      auditId,
      cardId,
      actorUserId: req.userId ?? null,
      action: parsed.data.to_column != null ? 'move' : 'update',
      sourceSurface: 'board',
    });

    const payload = {
      pack_version_used: persisted.orchestration_pack_version,
      ok: true,
    };
    await storeIdempotentResponse(req, idempotencyRoute, idempotent.key, idempotent.hash, { statusCode: 200, payload }, auditId);
    res.json(payload);
  } catch (err) {
    if (isIdempotencyPayloadConflictError(err)) {
      void emitPlanBoardConflict409({
        auditId,
        payload: {
          reason: 'idempotency_mismatch',
          pack_version_seen: null,
          pack_version_actual: null,
        },
      });
      sendApiError(
        res,
        409,
        API_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH,
        IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE,
      );
      return;
    }
    const error = err as Error;
    logger.error('route.plan_board_patch_unhandled', { error: error.message });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
