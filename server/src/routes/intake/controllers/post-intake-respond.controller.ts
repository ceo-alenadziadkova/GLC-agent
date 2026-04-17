import type { Request, Response } from 'express';

import {
  API_ERROR_CODES,
  INTAKE_INVALID_TOKEN_MESSAGE,
  INTAKE_LINK_EXPIRED_MESSAGE,
  INTAKE_LINK_NOT_FOUND_MESSAGE,
  INTAKE_PREBRIEF_INCOMPLETE_MESSAGE,
  INTAKE_RESPONSES_REQUIRED_MESSAGE,
  INTAKE_SAVE_RESPONSES_FAILED_MESSAGE,
  apiErrorJson,
  intakeResponsesSchemaInvalidMessage,
} from '../../../config/api-error-codes.js';
import { BriefResponsesSchema } from '../../../schemas/intake-brief.js';
import { arePreBriefSlotsSatisfied } from '../../../services/brief-validator.js';
import { logger } from '../../../services/logger.js';
import {
  emitIntakeSubmissionNotifications,
  tryMergePreBriefAfterClientSubmit,
} from '../../../services/intake/intake-respond.service.js';
import {
  intakeLinkExpired,
  isIntakeTokenFormatValid,
  normalizePublicIntakeRouteTokenParam,
} from '../../../services/intake/intake-token-guards.js';
import {
  fetchIntakeTokenRowForRespond,
  updateIntakeTokenResponses,
} from '../../../services/intake/intake-token.service.js';

export async function postIntakeRespondController(req: Request, res: Response) {
  try {
    const token = normalizePublicIntakeRouteTokenParam(req.params.token);
    if (!isIntakeTokenFormatValid(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
      return;
    }

    const row = await fetchIntakeTokenRowForRespond(token);
    if (!row) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_NOT_FOUND, INTAKE_LINK_NOT_FOUND_MESSAGE));
      return;
    }

    if (intakeLinkExpired(row.expires_at)) {
      res.status(410).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_EXPIRED, INTAKE_LINK_EXPIRED_MESSAGE));
      return;
    }

    const body = req.body?.responses;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_RESPONSES_REQUIRED, INTAKE_RESPONSES_REQUIRED_MESSAGE));
      return;
    }

    const parsed = BriefResponsesSchema.safeParse(body);
    if (!parsed.success) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.INTAKE_RESPONSES_SCHEMA_INVALID,
            intakeResponsesSchemaInvalidMessage(parsed.error.message),
          ),
        );
      return;
    }

    if (!arePreBriefSlotsSatisfied(parsed.data as Record<string, unknown>)) {
      res
        .status(400)
        .json(
          apiErrorJson(API_ERROR_CODES.INTAKE_PREBRIEF_INCOMPLETE, INTAKE_PREBRIEF_INCOMPLETE_MESSAGE),
        );
      return;
    }

    const submittedAt = new Date().toISOString();
    const updated = await updateIntakeTokenResponses(row.id, parsed.data as Record<string, unknown>, submittedAt);
    if (!updated) {
      logger.error('intake.respond_update_failed', { component: 'intake' });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_SAVE_RESPONSES_FAILED, INTAKE_SAVE_RESPONSES_FAILED_MESSAGE));
      return;
    }

    const auditId = row.audit_id as string | null;
    const consultantId = row.consultant_id as string;
    const parsedResponses = parsed.data as Record<string, unknown>;

    await tryMergePreBriefAfterClientSubmit(auditId, consultantId, parsedResponses);
    await emitIntakeSubmissionNotifications({
      auditId,
      consultantId,
      token,
      submittedAt,
      parsedResponses,
    });

    res.json({ ok: true as const, submitted_at: submittedAt });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.respond_exception', { component: 'intake', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.INTAKE_SAVE_RESPONSES_FAILED, INTAKE_SAVE_RESPONSES_FAILED_MESSAGE));
  }
}
