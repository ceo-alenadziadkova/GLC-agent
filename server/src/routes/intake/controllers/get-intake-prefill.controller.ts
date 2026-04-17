import type { Response } from 'express';

import {
  API_ERROR_CODES,
  INTAKE_INVALID_TOKEN_MESSAGE,
  INTAKE_LINK_NOT_FOUND_MESSAGE,
  INTAKE_NOT_ALLOWED_MESSAGE,
  INTAKE_PREFILL_LOAD_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { buildPreBriefQuestionsForResponses } from '../../../services/intake/intake-prebrief-questions.service.js';
import {
  intakeLinkExpired,
  isIntakeTokenFormatValid,
  normalizePrefillIntakeTokenParam,
} from '../../../services/intake/intake-token-guards.js';
import { fetchIntakeTokenRowForPrefill } from '../../../services/intake/intake-token.service.js';

export async function getIntakePrefillController(req: AuthRequest, res: Response) {
  try {
    const token = normalizePrefillIntakeTokenParam(req.params.token);
    if (!isIntakeTokenFormatValid(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
      return;
    }

    const row = await fetchIntakeTokenRowForPrefill(token);
    if (!row) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_NOT_FOUND, INTAKE_LINK_NOT_FOUND_MESSAGE));
      return;
    }
    if (row.consultant_id !== req.userId) {
      res.status(403).json(apiErrorJson(API_ERROR_CODES.INTAKE_NOT_ALLOWED, INTAKE_NOT_ALLOWED_MESSAGE));
      return;
    }

    const questions = buildPreBriefQuestionsForResponses((row.responses as Record<string, unknown>) ?? {});
    const linkExpired = intakeLinkExpired(row.expires_at as string);

    res.json({
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      questions,
      responses: (row.responses as Record<string, unknown>) ?? {},
      submitted_at: (row.submitted_at as string | null) ?? null,
      expires_at: row.expires_at as string,
      link_expired: linkExpired,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.prefill_get_exception', { component: 'intake', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.INTAKE_PREFILL_LOAD_FAILED, INTAKE_PREFILL_LOAD_FAILED_MESSAGE),
      );
  }
}
