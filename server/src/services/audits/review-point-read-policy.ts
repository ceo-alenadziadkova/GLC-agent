import type { UserRole } from '../../middleware/auth.js';
import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';

/** Only consultants may read `consultant_notes` / `interview_notes` on review points in API payloads. */
export function viewerMayReadPipelineReviewNotes(role: UserRole | undefined): boolean {
  return role === 'consultant';
}

export function redactReviewPointRowsForViewer<T extends Record<string, unknown>>(
  rows: T[],
  viewerRole: UserRole | undefined,
): T[] {
  if (viewerMayReadPipelineReviewNotes(viewerRole)) return rows;
  return rows.map((row) => ({
    ...row,
    consultant_notes: null,
    interview_notes: null,
  }));
}

type PipelineEventRow = Record<string, unknown> & {
  event_type?: unknown;
  data?: unknown;
};

/** Strips review notes from `review_approved` pipeline event payloads for non-consultants (legacy rows). */
export function redactPipelineEventsReviewNotesForViewer(
  events: unknown[],
  viewerRole: UserRole | undefined,
): unknown[] {
  if (viewerMayReadPipelineReviewNotes(viewerRole)) return events;
  return (events as PipelineEventRow[]).map((event) => {
    if (event.event_type !== PIPELINE_EVENT_TYPES.reviewApproved) return event;
    const data = event.data;
    if (!data || typeof data !== 'object' || data === null || Array.isArray(data)) return event;
    const d = data as Record<string, unknown>;
    if (!('consultant_notes' in d) && !('interview_notes' in d)) return event;
    return {
      ...event,
      data: {
        ...d,
        consultant_notes: null,
        interview_notes: null,
      },
    };
  });
}
