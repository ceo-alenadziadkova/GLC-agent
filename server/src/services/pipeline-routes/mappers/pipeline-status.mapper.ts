import type { AuditForStatus } from '../repository/pipeline-audit.repository.js';

export function toPipelineStatusPayload(audit: AuditForStatus, events: unknown[], reviews: unknown[]) {
  return {
    ...audit,
    events,
    reviews,
  };
}
