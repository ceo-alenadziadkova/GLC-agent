import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import {
  API_ERROR_CODES,
  AUDITS_ACCESS_DENIED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
} from '../../../config/api-error-codes.js';
import { AUDITS_INTAKE_FOLLOWUP_SUGGESTIONS_GET_FAILED_MESSAGE } from '../../../config/api-user-messages.en.js';
import { logger } from '../../../services/logger.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';
import { fetchAuditForBriefById } from '../../../repositories/audits/audits.repository.js';
import { canAccessAudit } from '../../../services/audits/audits-access.service.js';
import { getIntakeFollowupSuggestionsForAuditId } from '../../../services/intake/intake-followup-candidates.service.js';

export async function getIntakeFollowupSuggestionsController(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const { data: audit } = await fetchAuditForBriefById(id);
    if (!audit) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    if (!canAccessAudit(audit, req.userId!)) {
      sendApiError(res, 403, API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE);
      return;
    }
    const payload = await getIntakeFollowupSuggestionsForAuditId(id);
    if (payload == null) {
      res.json({ suggestions: null });
      return;
    }
    res.json({
      suggestions: {
        question_ids: payload.questionIds,
        case_keys: payload.caseKeys,
        next_recommended: payload.nextRecommended,
        questions: payload.questions,
      },
    });
  } catch (err) {
    const error = err as Error;
    logger.error('route.intake_followup_suggestions_failed', {
      component: 'audits',
      error: error.message,
      stack: error.stack,
    });
    sendApiError(
      res,
      500,
      API_ERROR_CODES.AUDITS_INTAKE_FOLLOWUP_SUGGESTIONS_GET_FAILED,
      AUDITS_INTAKE_FOLLOWUP_SUGGESTIONS_GET_FAILED_MESSAGE,
    );
  }
}
