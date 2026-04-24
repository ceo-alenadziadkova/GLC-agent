import type { UserRole } from '../../../middleware/auth.js';
import { PIPELINE_STATUS_EVENTS_LIMIT } from '../../../config/route-query-limits.js';
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
  query?: {
    limit?: number;
    before?: string;
    phase?: number;
    event_type?: string;
    detail_level?: 'default' | 'debug';
  };
}): Promise<PipelineStatusResult> {
  const { auditId, userId, viewerRole, query } = params;
  const [audit, events, reviews] = await Promise.all([
    fetchAuditForStatus(auditId, userId),
    fetchPipelineEventsForAudit(auditId, query),
    fetchReviewPointsForAudit(auditId),
  ]);

  if (!audit) return { ok: false, error: pipelineRouteErr.auditNotFound() };
  return {
    ok: true,
    payload: toPipelineStatusPayload(
      audit,
      events,
      reviews,
      viewerRole,
      query?.limit ?? PIPELINE_STATUS_EVENTS_LIMIT,
      query?.detail_level,
    ),
  };
}
