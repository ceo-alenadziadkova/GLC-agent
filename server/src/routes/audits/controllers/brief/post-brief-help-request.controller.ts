import type { Response } from 'express';
import type { AuthRequest } from '../../../../middleware/auth.js';
import {
  API_ERROR_CODES,
  AUDITS_BRIEF_HELP_ACCESS_DENIED_MESSAGE,
  AUDITS_BRIEF_HELP_CLIENT_ONLY_MESSAGE,
  AUDITS_BRIEF_HELP_FAILED_MESSAGE,
  AUDITS_BRIEF_HELP_WRONG_PHASE_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
} from '../../../../config/api-error-codes.js';
import { REQUEST_FIELD_LIMITS } from '../../../../config/request-field-limits.js';
import { logger } from '../../../../services/logger.js';
import { sendApiError } from '../../mappers/audits-http.mapper.js';
import {
  BRIEF_HELP_REQUESTED_NOTIFICATION_TITLE,
  briefHelpRequestedNotificationMessage,
} from '../../../../config/route-notification-messages.js';
import { emitStructuredNotification } from '../../../../services/notifications.js';
import { assertClientRole } from '../../../../services/audits/audits-access.service.js';
import {
  AUDIT_UI_ROUTE_PREFIX,
  BRIEF_HELP_ALLOWED_AUDIT_STATUS,
} from '../../config/audits-route-policy.js';
import {
  fetchAuditForHelpRequestById,
  markBriefHelpRequested,
} from '../../../../repositories/audits/audits.repository.js';
import { briefHelpRequestBodySchema } from '../../validators/audits-route-input.validator.js';

export async function postBriefHelpRequestController(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;
    if (!assertClientRole(req.userRole)) {
      sendApiError(
        res,
        403,
        API_ERROR_CODES.AUDITS_BRIEF_HELP_CLIENT_ONLY,
        AUDITS_BRIEF_HELP_CLIENT_ONLY_MESSAGE,
      );
      return;
    }

    const parsed = briefHelpRequestBodySchema.safeParse(req.body ?? {});
    const rawMsg = parsed.success ? parsed.data.message : undefined;
    const message = typeof rawMsg === 'string' ? rawMsg.trim().slice(0, REQUEST_FIELD_LIMITS.clientNotesMax) : '';

    const { data: audit } = await fetchAuditForHelpRequestById(id);
    if (!audit) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    if (audit.client_id !== req.userId) {
      sendApiError(
        res,
        403,
        API_ERROR_CODES.AUDITS_BRIEF_HELP_ACCESS_DENIED,
        AUDITS_BRIEF_HELP_ACCESS_DENIED_MESSAGE,
      );
      return;
    }
    if ((audit.status as string) !== BRIEF_HELP_ALLOWED_AUDIT_STATUS) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_BRIEF_HELP_WRONG_PHASE,
        AUDITS_BRIEF_HELP_WRONG_PHASE_MESSAGE,
      );
      return;
    }

    const { error: updateError } = await markBriefHelpRequested(id, req.userId!, message || null);
    if (updateError) throw updateError;

    await emitStructuredNotification({
      category: 'help',
      event: 'brief_help_requested',
      priority: 'medium',
      audience: 'consultants',
      auditId: id,
      title: BRIEF_HELP_REQUESTED_NOTIFICATION_TITLE,
      message: briefHelpRequestedNotificationMessage(id.slice(0, REQUEST_FIELD_LIMITS.notificationAuditIdPrefixLen)),
      route: `${AUDIT_UI_ROUTE_PREFIX}/${id}`,
      payload: {
        audit_id: id,
        actor_role: 'client',
        help_message: message || undefined,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    const error = err as Error;
    logger.error('route.brief_help_request_failed', { component: 'audits', error: error.message, stack: error.stack });
    sendApiError(res, 500, API_ERROR_CODES.AUDITS_BRIEF_HELP_FAILED, AUDITS_BRIEF_HELP_FAILED_MESSAGE);
  }
}
