import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
} from '../../../config/api-error-codes.js';
import { logger } from '../../../services/logger.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';
import { getAuditViewModel } from '../../../services/audits/audits-read.service.js';

export async function getAuditController(req: AuthRequest, res: Response) {
  try {
    const model = await getAuditViewModel(req.params.id as string, req.userId!);
    if (!model) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    res.json(model);
  } catch (err) {
    const error = err as Error;
    logger.error('route.audit_get_failed', { component: 'audits', error: error.message, stack: error.stack });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
