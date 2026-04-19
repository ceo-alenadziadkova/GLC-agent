import type { UserRole } from '../../../middleware/auth.js';
import { pipelineRouteErr } from '../domain/pipeline-route.errors.js';
import type { PipelineStatusResult } from '../domain/pipeline-route.types.js';
import { toPipelineStatusPayload } from '../mappers/pipeline-status.mapper.js';
import { fetchAuditForStatus } from '../repository/pipeline-audit.repository.js';
import { fetchPipelineEventsForAudit } from '../repository/pipeline-event.repository.js';
import { fetchReviewPointsForAudit } from '../repository/pipeline-review.repository.js';

export async function loadPipelineStatus(params: {
  auditId: string;
  userId: string;
  viewerRole: UserRole | undefined;
}): Promise<PipelineStatusResult> {
  const { auditId, userId, viewerRole } = params;
  const [audit, events, reviews] = await Promise.all([
    fetchAuditForStatus(auditId, userId),
    fetchPipelineEventsForAudit(auditId),
    fetchReviewPointsForAudit(auditId),
  ]);

  if (!audit) return { ok: false, error: pipelineRouteErr.auditNotFound() };
  return { ok: true, payload: toPipelineStatusPayload(audit, events, reviews, viewerRole) };
}
