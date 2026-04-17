import type { Response } from 'express';
import type { AuthRequest } from '../../../../middleware/auth.js';
import {
  API_ERROR_CODES,
  AUDITS_ACCESS_DENIED_MESSAGE,
  AUDITS_BRIEF_ANALYTICS_ACCEPT_FAILED_MESSAGE,
  AUDITS_BRIEF_ANALYTICS_PAYLOAD_INVALID_MESSAGE,
  AUDITS_BRIEF_ANALYTICS_STORE_FAILED_MESSAGE,
  AUDITS_NOT_FOUND_MESSAGE,
} from '../../../../config/api-error-codes.js';
import { logger } from '../../../../services/logger.js';
import { sendApiError } from '../../mappers/audits-http.mapper.js';
import { fetchAuditOwnershipById } from '../../../../repositories/audits/audits.repository.js';
import { canAccessAudit } from '../../../../services/audits/audits-access.service.js';
import { briefAnalyticsBodySchema } from '../../validators/audits-route-input.validator.js';
import { insertBriefAnalyticsEvents } from '../../../../repositories/audits/audit-brief.repository.js';

export async function postBriefAnalyticsController(req: AuthRequest, res: Response) {
  try {
    const id = req.params.id as string;
    const parsed = briefAnalyticsBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      sendApiError(
        res,
        400,
        API_ERROR_CODES.AUDITS_BRIEF_ANALYTICS_PAYLOAD_INVALID,
        AUDITS_BRIEF_ANALYTICS_PAYLOAD_INVALID_MESSAGE,
        parsed.error.flatten(),
      );
      return;
    }
    const body = parsed.data;

    const { data: audit } = await fetchAuditOwnershipById(id);
    if (!audit) {
      sendApiError(res, 404, API_ERROR_CODES.AUDITS_NOT_FOUND, AUDITS_NOT_FOUND_MESSAGE);
      return;
    }
    if (!canAccessAudit(audit, req.userId!)) {
      sendApiError(res, 403, API_ERROR_CODES.AUDITS_ACCESS_DENIED, AUDITS_ACCESS_DENIED_MESSAGE);
      return;
    }

    const hasTuple = body.intake_versions && Object.values(body.intake_versions).some(v => v != null && v !== '');
    let versions: Record<string, unknown> | null = hasTuple ? { ...body.intake_versions } : null;
    if (body.experiment_variant) {
      versions = { ...(versions ?? {}), experimentVariant: body.experiment_variant };
    }

    const rows = body.events.map(event => ({
      surface: body.surface,
      event_type: event.event_type,
      client_session_id: body.client_session_id,
      audit_id: id,
      question_id: event.question_id ?? null,
      step_index: event.step_index ?? null,
      intake_versions: versions,
      client_ts: event.client_ts ?? null,
    }));

    const { error } = await insertBriefAnalyticsEvents(rows);
    if (error) {
      logger.error('route.brief_analytics_insert_failed', { component: 'audits', error: error.message, audit_id: id });
      sendApiError(
        res,
        500,
        API_ERROR_CODES.AUDITS_BRIEF_ANALYTICS_STORE_FAILED,
        AUDITS_BRIEF_ANALYTICS_STORE_FAILED_MESSAGE,
      );
      return;
    }
    res.status(200).json({ ok: true as const, received: rows.length });
  } catch (err) {
    const error = err as Error;
    logger.error('route.brief_analytics_failed', { component: 'audits', error: error.message, stack: error.stack });
    sendApiError(
      res,
      500,
      API_ERROR_CODES.AUDITS_BRIEF_ANALYTICS_ACCEPT_FAILED,
      AUDITS_BRIEF_ANALYTICS_ACCEPT_FAILED_MESSAGE,
    );
  }
}
