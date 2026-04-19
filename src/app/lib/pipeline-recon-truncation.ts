import { RECON_REVIEW_SUMMARY_POLICY } from '../config/recon-review-summary-policy';

type PipelineLikeEvent = {
  phase: number;
  event_type: string;
  message: string | null;
};

/**
 * True if phase 0 emitted a crawler context truncation warning (immutable event log).
 */
export function pipelineHasReconCrawlerTruncationWarning(events: readonly PipelineLikeEvent[]): boolean {
  const prefix = RECON_REVIEW_SUMMARY_POLICY.crawlerContextTruncatedMessagePrefix;
  return events.some(
    e =>
      e.phase === 0 &&
      e.event_type === 'warning' &&
      typeof e.message === 'string' &&
      e.message.startsWith(prefix),
  );
}
