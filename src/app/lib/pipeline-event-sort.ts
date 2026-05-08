import type { PipelineEvent } from '../data/auditTypes';

/**
 * Newest-first merge order for `pipeline_events` rows in the SPA.
 * Prefers DB `event_seq` when both rows have it (migration 084); otherwise `created_at` and `id` tie-breaks.
 */
export function comparePipelineEventsNewestFirst(a: PipelineEvent, b: PipelineEvent): number {
  const aSeq = a.event_seq;
  const bSeq = b.event_seq;
  if (typeof aSeq === 'number' && typeof bSeq === 'number' && aSeq !== bSeq) {
    return bSeq - aSeq;
  }
  const byTime = b.created_at.localeCompare(a.created_at);
  if (byTime !== 0) return byTime;
  const aid = typeof a.id === 'number' ? a.id : Number(a.id);
  const bid = typeof b.id === 'number' ? b.id : Number(b.id);
  return bid - aid;
}
