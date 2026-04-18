import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { API_ERROR_CODES, AUDITS_LIST_FAILED_MESSAGE } from '../../../config/api-error-codes.js';
import { logger } from '../../../services/logger.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';
import { getAuditList } from '../../../services/audits/audits-read.service.js';
import { listAuditsQuerySchema } from '../validators/audits-route-input.validator.js';

export async function listAuditsController(req: AuthRequest, res: Response) {
  try {
    const parsed = listAuditsQuerySchema.safeParse(req.query);
    const result = await getAuditList(req.userId!, parsed.success ? parsed.data : {});
    res.json(result);
  } catch (err) {
    const error = err as Error;
    logger.error('route.audits_list_failed', { component: 'audits', error: error.message, stack: error.stack });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_LIST_FAILED, AUDITS_LIST_FAILED_MESSAGE);
  }
}
