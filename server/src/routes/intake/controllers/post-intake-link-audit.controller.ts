import type { Response } from 'express';

import {
  API_ERROR_CODES,
  INTAKE_AUDIT_ID_REQUIRED_MESSAGE,
  INTAKE_AUDIT_NOT_FOUND_MESSAGE,
  INTAKE_INVALID_TOKEN_MESSAGE,
  INTAKE_LINK_AUDIT_FAILED_MESSAGE,
  INTAKE_LINK_TOKEN_FAILED_MESSAGE,
  INTAKE_NOT_ALLOWED_MESSAGE,
  INTAKE_PREBRIEF_AUDIT_OWNER_MISMATCH_MESSAGE,
  INTAKE_TOKEN_LINKED_CONFLICT_MESSAGE,
  INTAKE_TOKEN_NOT_FOUND_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { BriefResponsesSchema } from '../../../schemas/intake-brief.js';
import { logger } from '../../../services/logger.js';
import { mergePreBriefFromParsedResponses } from '../../../services/intake/intake-prebrief-merge.service.js';
import {
  fetchAuditOwnedByConsultant,
  fetchIntakeTokenRowForLinkAudit,
  updateIntakeTokenAuditId,
} from '../../../services/intake/intake-token.service.js';
import { parseNonEmptyTrimmedString, parseTrimmedIntakeTokenFromString } from '../validators/intake-route-input.validator.js';

export async function postIntakeLinkAuditController(req: AuthRequest, res: Response) {
  try {
    const token = parseTrimmedIntakeTokenFromString(req.body?.token) ?? '';
    const audit_id = parseNonEmptyTrimmedString(req.body?.audit_id) ?? '';
    if (!token) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
      return;
    }
    if (!audit_id) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_AUDIT_ID_REQUIRED, INTAKE_AUDIT_ID_REQUIRED_MESSAGE));
      return;
    }

    const tokRow = await fetchIntakeTokenRowForLinkAudit(token);
    if (!tokRow) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_TOKEN_NOT_FOUND, INTAKE_TOKEN_NOT_FOUND_MESSAGE));
      return;
    }
    if (tokRow.consultant_id !== req.userId) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.INTAKE_NOT_ALLOWED, INTAKE_NOT_ALLOWED_MESSAGE));
      return;
    }
    const existingAudit = tokRow.audit_id as string | null;
    if (existingAudit && existingAudit !== audit_id) {
      res
        .status(409)
        .json(
          apiErrorJson(API_ERROR_CODES.INTAKE_TOKEN_LINKED_CONFLICT, INTAKE_TOKEN_LINKED_CONFLICT_MESSAGE),
        );
      return;
    }

    const audit = await fetchAuditOwnedByConsultant(audit_id, req.userId!);
    if (!audit) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_AUDIT_NOT_FOUND, INTAKE_AUDIT_NOT_FOUND_MESSAGE));
      return;
    }

    const updated = await updateIntakeTokenAuditId(tokRow.id, audit_id);
    if (!updated) {
      logger.error('intake.link_audit_update_failed', { component: 'intake' });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_TOKEN_FAILED, INTAKE_LINK_TOKEN_FAILED_MESSAGE));
      return;
    }

    const rawResponses = tokRow.responses as Record<string, unknown>;
    const parsed = BriefResponsesSchema.safeParse(rawResponses);
    if (parsed.success && Object.keys(parsed.data).length > 0) {
      try {
        const outcome = await mergePreBriefFromParsedResponses(
          audit_id,
          req.userId!,
          parsed.data as Record<string, unknown>,
        );
        if (outcome === 'consultant_not_audit_owner') {
          logger.warn('intake.link_audit_merge_skipped', {
            component: 'intake',
            code: API_ERROR_CODES.INTAKE_PREBRIEF_AUDIT_OWNER_MISMATCH,
            message: INTAKE_PREBRIEF_AUDIT_OWNER_MISMATCH_MESSAGE,
          });
        }
      } catch (mergeErr) {
        logger.warn('intake.link_audit_merge_skipped', {
          component: 'intake',
          error: (mergeErr as Error).message,
        });
      }
    }

    res.json({ ok: true as const });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.link_audit_exception', { component: 'intake', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_AUDIT_FAILED, INTAKE_LINK_AUDIT_FAILED_MESSAGE));
  }
}
