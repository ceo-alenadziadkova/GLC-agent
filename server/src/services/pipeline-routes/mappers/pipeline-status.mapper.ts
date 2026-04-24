import type { UserRole } from '../../../middleware/auth.js';
import {
  redactPipelineEventsReviewNotesForViewer,
  redactReviewPointRowsForViewer,
  viewerMayReadPipelineReviewNotes,
} from '../../audits/review-point-read-policy.js';
import type { AuditForStatus } from '../repository/pipeline-audit.repository.js';

type ReviewRow = {
  after_phase?: unknown;
  status?: unknown;
  consultant_notes?: unknown;
  interview_notes?: unknown;
};

/** Normalize review rows so JSON always includes nullable note fields (client assert + UX). */
export function toPipelineStatusPayload(
  audit: AuditForStatus,
  events: unknown[],
  reviews: unknown[],
  viewerRole: UserRole | undefined,
  eventPageLimit: number,
  detailLevel: 'default' | 'debug' = 'default',
) {
  const normalizedReviews = (reviews as ReviewRow[]).map(row => ({
    after_phase: row.after_phase,
    status: row.status,
    consultant_notes: row.consultant_notes ?? null,
    interview_notes: row.interview_notes ?? null,
  }));

  const reviewsOut = viewerMayReadPipelineReviewNotes(viewerRole)
    ? normalizedReviews
    : redactReviewPointRowsForViewer(normalizedReviews as Array<Record<string, unknown>>, viewerRole);
  const eventsOut = redactPipelineEventsReviewNotesForViewer(events, viewerRole);

  return {
    ...audit,
    events: eventsOut,
    reviews: reviewsOut,
    event_page: {
      limit: eventPageLimit,
      next_before:
        events.length > 0
          ? ((events[events.length - 1] as { created_at?: string }).created_at ?? null)
          : null,
      detail_level: detailLevel,
    },
  };
}
