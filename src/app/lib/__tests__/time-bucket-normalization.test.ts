import { describe, expect, it } from 'vitest';

import type { AuditTimelineDto } from '../../data/api/audits-orchestration';
import {
  criticalPathCountSplitBounds,
  estimatedTimelineItemWindowWithinThirds,
  timelineHorizonThirdBoundaries,
} from '../time-bucket-normalization';

function timelineWithHorizon(start: string, end: string): AuditTimelineDto {
  return {
    status: 'ready',
    version: {
      roadmap_version: 1,
      manifest_snapshot_id: 'snap-1',
      latest_manifest_snapshot_id: 'snap-1',
      stale_manifest: false,
      manifest_state: 'confirmed',
      season_preset: 'rolling_90d',
      plan_horizon: { start_date: start, end_date: end },
    },
    seasons: [],
    lanes: [],
    dependencies: [],
    top_7d: [],
    top_30d: [],
    waiting_list_domains: [],
    data_gaps: null,
  };
}

describe('criticalPathCountSplitBounds', () => {
  it('matches legacy ceil(n/3) and ceil(2n/3) splits', () => {
    expect(criticalPathCountSplitBounds(0)).toEqual({ a: 0, b: 0 });
    expect(criticalPathCountSplitBounds(5)).toEqual({ a: 2, b: 4 });
    expect(criticalPathCountSplitBounds(7)).toEqual({ a: 3, b: 5 });
  });

  it('floors fractional node counts', () => {
    expect(criticalPathCountSplitBounds(3.9)).toEqual(criticalPathCountSplitBounds(3));
  });
});

describe('estimatedTimelineItemWindowWithinThirds', () => {
  const thirds: { start: number; end: number }[] = [
    { start: 0, end: 100 },
    { start: 100, end: 200 },
    { start: 200, end: 300 },
  ];

  it('uses time_bucket mapping when season_index is absent', () => {
    expect(
      estimatedTimelineItemWindowWithinThirds(
        { id: 'a', time_bucket: 'now' } as AuditTimelineDto['lanes'][number]['items'][number],
        thirds,
      ),
    ).toEqual({ start: 0, end: 100, isEstimated: true });
    expect(
      estimatedTimelineItemWindowWithinThirds(
        { id: 'b', time_bucket: 'later' } as AuditTimelineDto['lanes'][number]['items'][number],
        thirds,
      ),
    ).toEqual({ start: 200, end: 300, isEstimated: true });
  });

  it('uses season_index slice when in range', () => {
    const w = estimatedTimelineItemWindowWithinThirds(
      { id: 'c', season_index: 1, time_bucket: 'now' } as AuditTimelineDto['lanes'][number]['items'][number],
      thirds,
    );
    expect(w.start).toBe(100);
    expect(w.end).toBeGreaterThan(w.start);
    expect(w.isEstimated).toBe(true);
  });
});

describe('timelineHorizonThirdBoundaries', () => {
  it('returns three contiguous windows spanning the horizon', () => {
    const nowMs = Date.UTC(2026, 0, 15, 12);
    const boundaries = timelineHorizonThirdBoundaries(timelineWithHorizon('2026-01-01', '2026-01-31'), { nowMs });
    expect(boundaries).toHaveLength(3);
    expect(boundaries[0]!.start).toBeLessThanOrEqual(boundaries[0]!.end);
    expect(boundaries[0]!.end).toBe(boundaries[1]!.start);
    expect(boundaries[1]!.end).toBe(boundaries[2]!.start);
    expect(boundaries[2]!.end).toBeGreaterThanOrEqual(boundaries[2]!.start);
  });
});
