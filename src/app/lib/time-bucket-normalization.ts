/**
 * Two distinct “thirds” conventions used across Plan views — keep names explicit to avoid mixing:
 * - **Timeline horizon**: calendar plan window split in three equal time slices (Gantt / API timeline).
 * - **Critical path count**: node index ranges by count thirds (Strategy Lab seasonal projection).
 *
 * Re-exports `timeBucketForSeasonIndexOneBased` as the shared season_index → `time_bucket` map.
 */
import dayjs from 'dayjs';

import type { AuditTimelineDto } from '../data/api/audits-orchestration';
import { ROADMAP_GANTT_DAY_MS } from '../config/roadmap-gantt-view-preferences';

export { timeBucketForSeasonIndexOneBased, type OrchestrationTimelineTimeBucket } from './orchestration-time-buckets';

export type TimeWindowMs = { start: number; end: number };

/**
 * Splits the audit timeline plan horizon into three contiguous windows (ms).
 * Used when mapping roadmap items onto the Gantt from `AuditTimelineDto`.
 */
export type TimelineLaneItemForEstimatedWindow = AuditTimelineDto['lanes'][number]['items'][number];

/**
 * Maps a timeline lane item onto a coarse ms window using horizon thirds (`now` / `next` / `later`),
 * optionally refined by zero-based `season_index` aligned to the same thirds.
 * Shared by the roadmap Gantt mapper and any other surface that must stay consistent with bucket semantics.
 */
export function estimatedTimelineItemWindowWithinThirds(
  item: TimelineLaneItemForEstimatedWindow,
  horizonThirds: ReadonlyArray<TimeWindowMs>,
): { start: number; end: number; isEstimated: boolean } {
  if (horizonThirds.length < 3) {
    const fallback = horizonThirds[0] ?? { start: 0, end: ROADMAP_GANTT_DAY_MS };
    return { start: fallback.start, end: fallback.end, isEstimated: true };
  }
  const buckets = horizonThirds;
  const bySeason =
    typeof item.season_index === 'number' && item.season_index >= 0 && item.season_index < buckets.length
      ? buckets[item.season_index]
      : null;
  if (bySeason != null) {
    return {
      start: bySeason.start,
      end: Math.max(bySeason.start + 7 * ROADMAP_GANTT_DAY_MS, bySeason.end),
      isEstimated: true,
    };
  }

  if (item.time_bucket === 'now') return { start: buckets[0]!.start, end: buckets[0]!.end, isEstimated: true };
  if (item.time_bucket === 'next') return { start: buckets[1]!.start, end: buckets[1]!.end, isEstimated: true };
  if (item.time_bucket === 'later') return { start: buckets[2]!.start, end: buckets[2]!.end, isEstimated: true };

  return { start: buckets[1]!.start, end: buckets[1]!.end, isEstimated: true };
}

export function timelineHorizonThirdBoundaries(timeline: AuditTimelineDto, opts?: { nowMs?: number }): TimeWindowMs[] {
  const horizon = timeline.version.plan_horizon;
  const nowAnchor =
    opts?.nowMs != null ? dayjs(opts.nowMs).startOf('day').valueOf() : dayjs().startOf('day').valueOf();
  const fallbackStart = nowAnchor;
  const fallbackEnd = dayjs(nowAnchor).add(180, 'day').endOf('day').valueOf();

  const start = horizon?.start_date ? dayjs(horizon.start_date).startOf('day').valueOf() : fallbackStart;
  const end = horizon?.end_date ? dayjs(horizon.end_date).endOf('day').valueOf() : fallbackEnd;
  const safeStart = Number.isFinite(start) ? start : fallbackStart;
  const safeEnd = Number.isFinite(end) && end > safeStart ? end : fallbackEnd;
  const span = Math.max(safeEnd - safeStart, 3 * ROADMAP_GANTT_DAY_MS);
  const slice = Math.floor(span / 3);

  return [
    { start: safeStart, end: safeStart + slice },
    { start: safeStart + slice, end: safeStart + 2 * slice },
    { start: safeStart + 2 * slice, end: safeEnd },
  ];
}

/** Split `[0 .. nodeCount)` into three segments of critical-path IDs (near / mid / far). */
export function criticalPathCountSplitBounds(nodeCount: number): { a: number; b: number } {
  const n = Math.max(0, Math.floor(nodeCount));
  if (n === 0) return { a: 0, b: 0 };
  return {
    a: Math.ceil(n / 3),
    b: Math.ceil((2 * n) / 3),
  };
}
