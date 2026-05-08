import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { resolveAuditPlanBoardAccess } from '../../../services/plan-board/plan-board-access.js';
import { listPlanTicketComments } from '../../../services/plan-board/plan-ticket-activity.service.js';
import { logger } from '../../../services/logger.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function getPlanTicketCommentsController(req: AuthRequest, res: Response) {
  const auditId = req.params.id as string;
  const cardId = req.params.cardId as string;
  const limitRaw = Number(req.query.limit ?? 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.trunc(limitRaw), 1), 300) : 100;
  try {
    const access = await resolveAuditPlanBoardAccess({ auditId, userId: req.userId!, userRole: req.userRole });
    if (!access.ok) {
      sendApiError(
        res,
        access.reason === 'denied' ? 403 : 404,
        API_ERROR_CODES.AUDITS_NOT_FOUND,
        AUDITS_NOT_FOUND_MESSAGE,
      );
      return;
    }
    const { rows, error } = await listPlanTicketComments({ auditId, cardId, limit });
    if (error) {
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }
    res.json({ comments: rows });
  } catch (err) {
    logger.error('route.plan_ticket_comments_get_unhandled', { auditId, cardId, error: (err as Error).message });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
