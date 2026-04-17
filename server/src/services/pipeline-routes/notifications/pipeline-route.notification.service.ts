import { buildPipelineUiRoute } from '../../../config/route-notification-paths.js';
import {
  PIPELINE_RETRY_STARTED_NOTIFICATION_TITLE,
  PIPELINE_REVIEW_APPROVED_NOTIFICATION_TITLE,
  pipelineRetryStartedNotificationMessage,
} from '../../../config/route-notification-messages.js';
import { emitStructuredNotification, notifyAuditParticipantsExcept } from '../../notifications.js';

export async function sendPipelineRetryNotifications(params: {
  auditId: string;
  actorUserId: string;
  phase: number;
}): Promise<void> {
  const { auditId, actorUserId, phase } = params;
  await notifyAuditParticipantsExcept(
    auditId,
    'pipeline',
    PIPELINE_RETRY_STARTED_NOTIFICATION_TITLE,
    pipelineRetryStartedNotificationMessage(phase),
    [actorUserId],
    {
      phase,
      status: 'retrying',
      route: buildPipelineUiRoute(auditId),
      occurred_at: new Date().toISOString(),
      actor_role: 'consultant',
      failure_type: 'retry_started',
    },
  );
}

export async function sendReviewApprovedNotification(params: {
  auditId: string;
  phase: number;
  message: string;
}): Promise<void> {
  const { auditId, phase, message } = params;
  await emitStructuredNotification({
    category: 'review',
    event: 'review_approved',
    priority: 'low',
    audience: 'audit_participants',
    auditId,
    title: PIPELINE_REVIEW_APPROVED_NOTIFICATION_TITLE,
    message,
    payload: { phase },
    route: buildPipelineUiRoute(auditId),
  });
}
