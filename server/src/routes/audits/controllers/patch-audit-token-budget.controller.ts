import type { Response } from 'express';
import { z } from 'zod';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
  AUDITS_TOKEN_BUDGET_TOPUP_FAILED_MESSAGE,
  AUDITS_TOKEN_BUDGET_TOPUP_INVALID_MESSAGE,
  PLATFORM_ADMIN_ONLY_MESSAGE,
} from '../../../config/api-error-codes.js';
import {
  AUDIT_TOKEN_BUDGET_TOPUP_MAX_DELTA,
  AUDIT_TOKEN_BUDGET_TOPUP_MIN_DELTA,
  AUDIT_TOKEN_BUDGET_TOPUP_REASON_MAX_LEN,
} from '../../../config/audit-token-budget-topup-policy.js';
import { canManagePlatformSettings } from '../../../lib/platform-admin.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { applyAuditTokenBudgetTopup } from '../../../services/audits/audit-token-budget-topup.service.js';
import { supabase } from '../../../services/supabase.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

const TopupBodySchema = z
  .object({
    delta_tokens: z
      .number()
      .int()
      .min(AUDIT_TOKEN_BUDGET_TOPUP_MIN_DELTA)
      .max(AUDIT_TOKEN_BUDGET_TOPUP_MAX_DELTA),
    reason: z
      .string()
      .max(AUDIT_TOKEN_BUDGET_TOPUP_REASON_MAX_LEN)
      .optional(),
  })
  .strict();

export async function patchAuditTokenBudgetController(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId;
    if (!userId) {
      sendApiError(res, 401, API_ERROR_CODES.AUTH_NOT_AUTHENTICATED, 'not_authenticated');
      return;
    }

    if (req.userRole !== 'consultant') {
      sendApiError(res, 403, API_ERROR_CODES.PLATFORM_ADMIN_ONLY, PLATFORM_ADMIN_ONLY_MESSAGE);
      return;
    }

    const isPlatformAdmin = await canManagePlatformSettings(userId);
    if (!isPlatformAdmin) {
      sendApiError(res, 403, API_ERROR_CODES.PLATFORM_ADMIN_ONLY, PLATFORM_ADMIN_ONLY_MESSAGE);
      return;
    }

    const parsed = TopupBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_TOKEN_BUDGET_TOPUP_INVALID,
        AUDITS_TOKEN_BUDGET_TOPUP_INVALID_MESSAGE,
        { issues: parsed.error.issues },
      );
      return;
    }

    const auditId = req.params.id as string;

    const { data: auditRow, error: auditErr } = await supabase
      .from('audits')
      .select('id')
      .eq('id', auditId)
      .maybeSingle();
    if (auditErr) {
      logger.error('route.patch_audit_token_budget.lookup_failed', {
        auditId,
        error: auditErr.message,
      });
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }
    if (!auditRow) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }

    const outcome = await applyAuditTokenBudgetTopup({
      auditId,
      grantedByUserId: userId,
      deltaTokens: parsed.data.delta_tokens,
      reason: parsed.data.reason ?? null,
    });

    if (!outcome.ok) {
      if (outcome.reason === 'audit_not_found') {
        sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
        return;
      }
      if (
        outcome.reason === 'audit_id_invalid' ||
        outcome.reason === 'delta_invalid' ||
        outcome.reason === 'reason_too_long'
      ) {
        sendApiError(
          res,
          400,
          API_ERROR_CODES.AUDITS_TOKEN_BUDGET_TOPUP_INVALID,
          AUDITS_TOKEN_BUDGET_TOPUP_INVALID_MESSAGE,
          { reason: outcome.reason },
        );
        return;
      }
      sendApiError(
        res,
        500,
        API_ERROR_CODES.AUDITS_TOKEN_BUDGET_TOPUP_FAILED,
        AUDITS_TOKEN_BUDGET_TOPUP_FAILED_MESSAGE,
      );
      return;
    }

    res.status(200).json({
      grant_id: outcome.grant_id,
      previous_budget: outcome.previous_budget,
      token_budget: outcome.token_budget,
      tokens_used: outcome.tokens_used,
      tokens_remaining: outcome.tokens_remaining,
    });
  } catch (err) {
    const error = err as Error;
    logger.error('route.patch_audit_token_budget.unhandled', { error: error.message });
    sendApiError(
      res,
      500,
      API_ERROR_CODES.AUDITS_TOKEN_BUDGET_TOPUP_FAILED,
      AUDITS_TOKEN_BUDGET_TOPUP_FAILED_MESSAGE,
    );
  }
}
