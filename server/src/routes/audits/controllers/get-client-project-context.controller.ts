import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import {
  API_ERROR_CODES,
  AUDITS_ACCESS_DENIED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
} from '../../../config/api-error-codes.js';
import { AUDITS_CLIENT_PROJECT_CONTEXT_GET_FAILED_MESSAGE } from '../../../config/api-user-messages.en.js';
import { logger } from '../../../services/logger.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';
import { fetchAuditForBriefById } from '../../../repositories/audits/audits.repository.js';
import { canAccessAudit } from '../../../services/audits/audits-access.service.js';
import {
  loadClientProjectContextForAuditId,
  loadCollectedDataPrecheckForAuditId,
} from '../../../services/client-project/client-project-context.service.js';

export async function getClientProjectContextController(req: AuthRequest, res: Response) {
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
    const [context, precheck] = await Promise.all([
      loadClientProjectContextForAuditId(id),
      loadCollectedDataPrecheckForAuditId(id),
    ]);
    res.json({ context, precheck });
  } catch (err) {
    const error = err as Error;
    logger.error('route.client_project_context_get_failed', {
      component: 'audits',
      error: error.message,
      stack: error.stack,
    });
    sendApiError(
      res,
      500,
      API_ERROR_CODES.AUDITS_CLIENT_PROJECT_CONTEXT_GET_FAILED,
      AUDITS_CLIENT_PROJECT_CONTEXT_GET_FAILED_MESSAGE,
    );
  }
}
