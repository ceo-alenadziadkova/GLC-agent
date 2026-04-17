import type { Response } from 'express';

import {
  API_ERROR_CODES,
  INTAKE_LIST_SUBMISSIONS_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { logger } from '../../../services/logger.js';
import { listConsultantSubmittedIntakeTokens } from '../../../services/intake/intake-token.service.js';
import { mapIntakeSubmissionsRows } from '../mappers/intake-http.mapper.js';

export async function getIntakeSubmissionsController(req: AuthRequest, res: Response) {
  try {
    const { rows, errorMessage } = await listConsultantSubmittedIntakeTokens(req.userId!);
    if (errorMessage) {
      logger.error('intake.submissions_list_failed', { component: 'intake', error: errorMessage });
      res
        .status(500)
        .json(
          apiErrorJson(API_ERROR_CODES.INTAKE_LIST_SUBMISSIONS_FAILED, INTAKE_LIST_SUBMISSIONS_FAILED_MESSAGE),
        );
      return;
    }

    res.json({ submissions: mapIntakeSubmissionsRows(rows ?? []) });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.submissions_exception', { component: 'intake', error: e.message, stack: e.stack });
    res
      .status(500)
      .json(
        apiErrorJson(API_ERROR_CODES.INTAKE_LIST_SUBMISSIONS_FAILED, INTAKE_LIST_SUBMISSIONS_FAILED_MESSAGE),
      );
  }
}
