import { pipelineReviewApprovedMessage } from '../../../config/route-notification-messages.js';
import { qualityGateRequiresConsultantNotes } from '../quality-gate-review.policy.js';
import { pipelineRouteErr } from '../domain/pipeline-route.errors.js';
import type { PipelineReviewApproveResult } from '../domain/pipeline-route.types.js';
import { sendReviewApprovedNotification } from '../notifications/pipeline-route.notification.service.js';
import { fetchConsultantOwnedAudit } from '../repository/pipeline-audit.repository.js';
import {
  fetchLatestQualityGateEventReport,
  insertReviewApprovedEvent,
} from '../repository/pipeline-event.repository.js';
import { approvePendingReview } from '../repository/pipeline-review.repository.js';

export async function runReviewApprove(params: {
  auditId: string;
  userId: string;
  afterPhase: number;
  consultantNotes: string | null;
  interviewNotes: string | null;
}): Promise<PipelineReviewApproveResult> {
  const { auditId, userId, afterPhase, consultantNotes, interviewNotes } = params;
  const audit = await fetchConsultantOwnedAudit(auditId, userId);
  if (!audit) return { ok: false, error: pipelineRouteErr.auditNotFound() };

  const qgReport = await fetchLatestQualityGateEventReport(auditId, afterPhase);
  if (qgReport) {
    const parsed = qgReport as { passed: boolean; flags: Array<{ severity: string }> };
    if (qualityGateRequiresConsultantNotes(parsed) && !consultantNotes) {
      return { ok: false, error: pipelineRouteErr.qualityGateRequiresNotes() };
    }
  }

  const approved = await approvePendingReview({
    auditId,
    afterPhase,
    consultantNotes,
    interviewNotes,
  });
  if (approved.error) throw approved.error;
  if (!approved.data) return { ok: true, response: { status: 'already_approved' } };

  const message = pipelineReviewApprovedMessage(afterPhase);
  await insertReviewApprovedEvent({
    auditId,
    phase: afterPhase,
    message,
  });
  await sendReviewApprovedNotification({ auditId, phase: afterPhase, message });

  return { ok: true, response: approved.data as Record<string, unknown> };
}
