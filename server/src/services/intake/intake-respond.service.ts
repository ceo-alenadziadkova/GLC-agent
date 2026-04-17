import {
  INTAKE_PREBRIEF_AUDIT_OWNER_MISMATCH_MESSAGE,
  API_ERROR_CODES,
} from '../../config/api-error-codes.js';
import {
  INTAKE_RESPONSES_UPDATED_NOTIFICATION_TITLE,
  INTAKE_SUBMISSION_RECEIVED_NOTIFICATION_TITLE,
  intakePreBriefSubmittedNotificationMessage,
} from '../../config/route-notification-messages.js';
import { logger } from '../logger.js';
import { emitStructuredNotification } from '../notifications.js';
import { mergePreBriefFromParsedResponses } from './intake-prebrief-merge.service.js';

export async function tryMergePreBriefAfterClientSubmit(
  auditId: string | null,
  consultantUserId: string,
  parsedResponses: Record<string, unknown>,
): Promise<void> {
  if (!auditId) return;
  try {
    const outcome = await mergePreBriefFromParsedResponses(auditId, consultantUserId, parsedResponses);
    if (outcome === 'consultant_not_audit_owner') {
      logger.warn('intake.brief_merge_skipped', {
        component: 'intake',
        code: API_ERROR_CODES.INTAKE_PREBRIEF_AUDIT_OWNER_MISMATCH,
        message: INTAKE_PREBRIEF_AUDIT_OWNER_MISMATCH_MESSAGE,
      });
    }
  } catch (mergeErr) {
    logger.warn('intake.brief_merge_skipped', {
      component: 'intake',
      reason: 'merge_error',
      error: (mergeErr as Error).message,
    });
  }
}

export async function emitIntakeSubmissionNotifications(params: {
  auditId: string | null;
  consultantId: string;
  token: string;
  submittedAt: string;
  parsedResponses: Record<string, unknown>;
}): Promise<void> {
  const responseCount = Object.keys(params.parsedResponses).length;
  const preBriefMsg = intakePreBriefSubmittedNotificationMessage(responseCount);
  if (params.auditId) {
    await emitStructuredNotification({
      category: 'intake',
      event: 'intake_responses_updated',
      priority: 'low',
      audience: 'audit_participants',
      auditId: params.auditId,
      title: INTAKE_RESPONSES_UPDATED_NOTIFICATION_TITLE,
      message: preBriefMsg,
      payload: {
        token: params.token,
        submitted_at: params.submittedAt,
      },
      route: `/audit/${params.auditId}`,
    });
  } else {
    await emitStructuredNotification({
      category: 'intake',
      event: 'intake_submission_received',
      priority: 'low',
      audience: 'user',
      userId: params.consultantId,
      auditId: null,
      title: INTAKE_SUBMISSION_RECEIVED_NOTIFICATION_TITLE,
      message: preBriefMsg,
      payload: {
        token: params.token,
        submitted_at: params.submittedAt,
      },
    });
  }
}
