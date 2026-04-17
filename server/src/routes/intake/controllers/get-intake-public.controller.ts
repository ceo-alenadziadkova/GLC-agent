import type { Request, Response } from 'express';

import {
  API_ERROR_CODES,
  INTAKE_INVALID_TOKEN_MESSAGE,
  INTAKE_LINK_EXPIRED_MESSAGE,
  INTAKE_LINK_NOT_FOUND_MESSAGE,
  INTAKE_LOAD_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { logger } from '../../../services/logger.js';
import { buildPreBriefQuestionsForResponses } from '../../../services/intake/intake-prebrief-questions.service.js';
import {
  intakeLinkExpired,
  isIntakeTokenFormatValid,
  normalizePublicIntakeRouteTokenParam,
} from '../../../services/intake/intake-token-guards.js';
import { fetchIntakeTokenRowForPublicLoad } from '../../../services/intake/intake-token.service.js';

export async function getIntakePublicController(req: Request, res: Response) {
  try {
    const token = normalizePublicIntakeRouteTokenParam(req.params.token);
    if (!isIntakeTokenFormatValid(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
      return;
    }

    const row = await fetchIntakeTokenRowForPublicLoad(token);
    if (!row) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_NOT_FOUND, INTAKE_LINK_NOT_FOUND_MESSAGE));
      return;
    }

    if (intakeLinkExpired(row.expires_at as string)) {
      res.status(410).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_EXPIRED, INTAKE_LINK_EXPIRED_MESSAGE));
      return;
    }

    const questions = buildPreBriefQuestionsForResponses((row.responses as Record<string, unknown>) ?? {});

    res.json({
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      questions,
      responses: (row.responses as Record<string, unknown>) ?? {},
      submitted_at: (row.submitted_at as string | null) ?? null,
      expires_at: row.expires_at as string,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.public_get_exception', { component: 'intake', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.INTAKE_LOAD_FAILED, INTAKE_LOAD_FAILED_MESSAGE));
  }
}
