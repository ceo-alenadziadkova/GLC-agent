import type { Request, Response } from 'express';

import {
  API_ERROR_CODES,
  INTAKE_INVALID_TOKEN_MESSAGE,
  INTAKE_LINK_EXPIRED_MESSAGE,
  INTAKE_LINK_NOT_FOUND_MESSAGE,
  INTAKE_LOAD_FAILED_MESSAGE,
  INTAKE_PREBRIEF_INCOMPLETE_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { arePreBriefSlotsSatisfied } from '../../../services/brief-validator.js';
import { logger } from '../../../services/logger.js';
import { buildTailoredQuestionsForResponses } from '../../../services/intake/intake-tailored-questions.service.js';
import {
  intakeLinkExpired,
  isIntakeTokenFormatValid,
  normalizePublicIntakeRouteTokenParam,
} from '../../../services/intake/intake-token-guards.js';
import { fetchIntakeTokenRowForPublicLoad } from '../../../services/intake/intake-token.service.js';

export async function getIntakeTailoredQuestionsController(req: Request, res: Response) {
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

    const responses = (row.responses as Record<string, unknown>) ?? {};
    if (!arePreBriefSlotsSatisfied(responses)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.INTAKE_PREBRIEF_INCOMPLETE, INTAKE_PREBRIEF_INCOMPLETE_MESSAGE));
      return;
    }

    const built = buildTailoredQuestionsForResponses(responses);
    res.json({
      questions: built.questions,
      question_ids: built.questionIds,
      case_keys: built.caseKeys,
      next_recommended: built.nextRecommended,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.tailored_get_exception', { component: 'intake', error: e.message, stack: e.stack });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.INTAKE_LOAD_FAILED, INTAKE_LOAD_FAILED_MESSAGE));
  }
}
