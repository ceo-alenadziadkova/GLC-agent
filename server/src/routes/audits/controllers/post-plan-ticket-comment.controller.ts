import type { Response } from 'express';

import {
  API_ERROR_CODES,
  AUDITS_FETCH_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
} from '../../../config/api-error-codes.js';
import type { AuthRequest } from '../../../middleware/auth.js';
import { resolveAuditPlanBoardAccess } from '../../../services/plan-board/plan-board-access.js';
import { appendPlanTicketEvent, createPlanTicketComment } from '../../../services/plan-board/plan-ticket-activity.service.js';
import { logger } from '../../../services/logger.js';
import { PlanTicketCommentPostSchema } from '../../../schemas/plan-board.js';
import { sendApiError } from '../mappers/audits-http.mapper.js';

export async function postPlanTicketCommentController(req: AuthRequest, res: Response) {
  const auditId = req.params.id as string;
  const cardId = req.params.cardId as string;
  try {
    const parsed = PlanTicketCommentPostSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      sendApiError(res, 400, API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_PAYLOAD_INVALID, 'invalid_body');
      return;
    }

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

    const created = await createPlanTicketComment({
      auditId,
      cardId,
      authorUserId: req.userId ?? null,
      body: parsed.data.body,
      mentions: parsed.data.mentions ?? [],
    });
    if (!created.ok) {
      sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
      return;
    }

    await appendPlanTicketEvent({
      auditId,
      cardId,
      actorUserId: req.userId ?? null,
      action: 'comment',
      sourceSurface: parsed.data.source_surface ?? 'board',
      fieldChanges: { comment: { from: null, to: parsed.data.body } },
    });

    res.status(201).json({ ok: true, comment_id: created.id });
  } catch (err) {
    logger.error('route.plan_ticket_comment_post_unhandled', { auditId, cardId, error: (err as Error).message });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_FETCH_FAILED, AUDITS_FETCH_FAILED_MESSAGE);
  }
}
