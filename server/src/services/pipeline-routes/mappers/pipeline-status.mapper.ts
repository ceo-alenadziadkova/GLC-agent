import type { AuditForStatus } from '../repository/pipeline-audit.repository.js';

type ReviewRow = {
  after_phase?: unknown;
  status?: unknown;
  consultant_notes?: unknown;
  interview_notes?: unknown;
};

/** Normalize review rows so JSON always includes nullable note fields (client assert + UX). */
export function toPipelineStatusPayload(audit: AuditForStatus, events: unknown[], reviews: unknown[]) {
  const normalizedReviews = (reviews as ReviewRow[]).map(row => ({
    after_phase: row.after_phase,
    status: row.status,
    consultant_notes: row.consultant_notes ?? null,
    interview_notes: row.interview_notes ?? null,
  }));

  return {
    ...audit,
    events,
    reviews: normalizedReviews,
  };
}
