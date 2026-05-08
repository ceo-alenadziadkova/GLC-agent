import { pipelineRouteErr } from '../domain/pipeline-route.errors.js';
import type { PipelineReviewApproveResult } from '../domain/pipeline-route.types.js';
import { fetchConsultantOwnedAudit } from '../repository/pipeline-audit.repository.js';
import { requestMissingDataForPendingReview } from '../repository/pipeline-review.repository.js';

export async function runReviewRequestMissingData(params: {
  auditId: string;
  userId: string;
  afterPhase: number;
  consultantNotes: string | null;
  interviewNotes: string | null;
}): Promise<PipelineReviewApproveResult> {
  const { auditId, userId, afterPhase, consultantNotes, interviewNotes } = params;
  const audit = await fetchConsultantOwnedAudit(auditId, userId);
  if (!audit) return { ok: false, error: pipelineRouteErr.auditNotFound() };

  const updated = await requestMissingDataForPendingReview({
    auditId,
    afterPhase,
    consultantNotes,
    interviewNotes,
  });
  if (updated.error) throw updated.error;
  if (!updated.data) return { ok: false, error: pipelineRouteErr.reviewPending(afterPhase) };

  return { ok: true, response: { status: 'missing_data_requested', review: updated.data } };
}
