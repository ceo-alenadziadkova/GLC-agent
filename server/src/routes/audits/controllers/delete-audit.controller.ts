import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { API_ERROR_CODES, AUDITS_DELETE_FAILED_MESSAGE } from '../../../config/api-error-codes.js';
import { logger } from '../../../services/logger.js';
import { deleteAuditByIdAndOwner } from '../../../repositories/audits/audits.repository.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function deleteAuditController(req: AuthRequest, res: Response) {
  try {
    const { error } = await deleteAuditByIdAndOwner(req.params.id as string, req.userId!);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    const error = err as Error;
    logger.error('route.audit_delete_failed', { component: 'audits', error: error.message, stack: error.stack });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_DELETE_FAILED, AUDITS_DELETE_FAILED_MESSAGE);
  }
}
