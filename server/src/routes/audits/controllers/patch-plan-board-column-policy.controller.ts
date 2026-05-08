import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  ORCHESTRATION_PACK_API_DISABLED_MESSAGE,
} from '../../../config/api-error-codes.js';
import {
  PLAN_BOARD_COLUMN_POLICY_INVALID_MESSAGE,
  PLAN_BOARD_CUSTOM_COLUMNS_DISABLED_MESSAGE,
} from '../../../config/api-user-messages.en.js';
import { isOrchestrationPackApiEnabled, isPlanBoardCustomColumnsFeatureEnabled } from '../../../config/feature-flags.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import {
  buildDefaultResolvedPlanBoardPolicy,
  buildResolvedPlanBoardPolicyFromPut,
  fetchAuditPlanBoardPolicyFields,
  fetchPlanBoardOwnerEntitled,
  remapAllPlanBoardCardsForPolicyChange,
  resolvePlanBoardPolicyFromSources,
} from '../../../services/plan-board/plan-board-column-policy.service.js';
import { logger } from '../../../services/logger.js';
import { supabase } from '../../../services/supabase.js';
import {
  PlanBoardColumnPolicyPatchBodySchema,
  PlanBoardColumnPolicyPutSchema,
} from '../../../schemas/plan-board-column-policy.js';
import { resolveAuditPlanBoardAccess } from '../../../services/plan-board/plan-board-access.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function patchPlanBoardColumnPolicyController(req: AuthRequest, res: Response) {
  const auditId = req.params.id as string;

  try {
    if (!isOrchestrationPackApiEnabled()) {
      sendApiError(res, 403, API_ERROR_CODES.ORCHESTRATION_PACK_API_DISABLED, ORCHESTRATION_PACK_API_DISABLED_MESSAGE);
      return;
    }

    const parsed = PlanBoardColumnPolicyPatchBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      sendApiError(res, 400, API_ERROR_CODES.PLAN_BOARD_COLUMN_POLICY_INVALID, PLAN_BOARD_COLUMN_POLICY_INVALID_MESSAGE);
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

    const auditRow = await fetchAuditPlanBoardPolicyFields(auditId);
    if (!auditRow?.user_id) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    const ownerEntitled = await fetchPlanBoardOwnerEntitled(auditRow.user_id);
    const featureOn = isPlanBoardCustomColumnsFeatureEnabled();
    const canWrite = featureOn && (ownerEntitled || access.kind === 'platform_admin');
    if (!canWrite) {
      sendApiError(res, 403, API_ERROR_CODES.PLAN_BOARD_CUSTOM_COLUMNS_DISABLED, PLAN_BOARD_CUSTOM_COLUMNS_DISABLED_MESSAGE);
      return;
    }

    const oldResolved = resolvePlanBoardPolicyFromSources({
      featureEnabled: featureOn,
      ownerProfileEntitled: ownerEntitled,
      persistedPolicy: auditRow.plan_board_column_policy,
    });

    if (parsed.data.kind === 'reset') {
      const newResolved = buildDefaultResolvedPlanBoardPolicy();
      const remap = await remapAllPlanBoardCardsForPolicyChange({ auditId, oldResolved, newResolved });
      if (!remap.ok) {
        logger.error('route.plan_board_column_policy_remap_failed', { auditId, error: remap.error });
        sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
        return;
      }
      const { error: auErr } = await supabase
        .from('audits')
        .update({ plan_board_column_policy: null })
        .eq('id', auditId);
      if (auErr) {
        logger.error('route.plan_board_column_policy_audit_clear_failed', { auditId, error: auErr.message });
        sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
        return;
      }
      res.json({ ok: true });
      return;
    }

    const validatedPut = PlanBoardColumnPolicyPutSchema.safeParse(parsed.data.policy);
    if (!validatedPut.success) {
      sendApiError(res, 400, API_ERROR_CODES.PLAN_BOARD_COLUMN_POLICY_INVALID, PLAN_BOARD_COLUMN_POLICY_INVALID_MESSAGE);
      return;
    }

    let newResolved;
    try {
      newResolved = buildResolvedPlanBoardPolicyFromPut(validatedPut.data);
    } catch {
      sendApiError(res, 400, API_ERROR_CODES.PLAN_BOARD_COLUMN_POLICY_INVALID, PLAN_BOARD_COLUMN_POLICY_INVALID_MESSAGE);
      return;
    }

    const remap = await remapAllPlanBoardCardsForPolicyChange({ auditId, oldResolved, newResolved });
    if (!remap.ok) {
      logger.error('route.plan_board_column_policy_remap_failed', { auditId, error: remap.error });
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }

    const { error: auErr } = await supabase
      .from('audits')
      .update({ plan_board_column_policy: validatedPut.data })
      .eq('id', auditId);
    if (auErr) {
      logger.error('route.plan_board_column_policy_audit_write_failed', { auditId, error: auErr.message });
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    const error = err as Error;
    logger.error('route.plan_board_column_policy_unhandled', { auditId, error: error.message });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
