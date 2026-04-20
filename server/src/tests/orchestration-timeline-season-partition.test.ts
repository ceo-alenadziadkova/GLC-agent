import { describe, expect, it } from 'vitest';

import {
  ORCHESTRATION_TIMELINE_POLICY,
  partitionCriticalPathForTimelineDisplay,
  partitionCriticalPathIntoCalendarSeasonBuckets,
  partitionCriticalPathIntoSeasonBuckets,
  utcDayIndexFromIsoDate,
} from '../config/orchestration-timeline-policy.js';

describe('partitionCriticalPathIntoSeasonBuckets', () => {
  it('keeps manifest snapshot peek limit in policy (timeline read model)', () => {
    expect(ORCHESTRATION_TIMELINE_POLICY.latestManifestSnapshotsPeekLimit).toBe(1);
  });

  it('splits empty input into three empty buckets', () => {
    expect(partitionCriticalPathIntoSeasonBuckets([], 'rolling_90d')).toEqual({
      near: [],
      mid: [],
      far: [],
    });
  });

  it('uses rolling_30d to allocate more nodes to near term than rolling_180d', () => {
    const ids = Array.from({ length: 12 }, (_, i) => `n${i}`);
    const shortWindow = partitionCriticalPathIntoSeasonBuckets(ids, 'rolling_30d');
    const longWindow = partitionCriticalPathIntoSeasonBuckets(ids, 'rolling_180d');
    expect(shortWindow.near.length).toBeGreaterThan(longWindow.near.length);
    expect(shortWindow.near.length + shortWindow.mid.length + shortWindow.far.length).toBe(12);
    expect(longWindow.near.length + longWindow.mid.length + longWindow.far.length).toBe(12);
  });

  it('matches equal-thirds legacy split for rolling_90d on small lists', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const legacyNearEnd = Math.ceil(ids.length / 3);
    const legacyMidEnd = Math.ceil((2 * ids.length) / 3);
    const legacy = {
      near: ids.slice(0, legacyNearEnd),
      mid: ids.slice(legacyNearEnd, legacyMidEnd),
      far: ids.slice(legacyMidEnd),
    };
    const fromPolicy = partitionCriticalPathIntoSeasonBuckets(ids, 'rolling_90d');
    expect(fromPolicy).toEqual(legacy);
  });

  it('uses default balanced weights when season preset is null or undefined', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(partitionCriticalPathIntoSeasonBuckets(ids, null)).toEqual(
      partitionCriticalPathIntoSeasonBuckets(ids, 'rolling_90d'),
    );
    expect(partitionCriticalPathIntoSeasonBuckets(ids, undefined)).toEqual(
      partitionCriticalPathIntoSeasonBuckets(ids, 'rolling_90d'),
    );
  });

  it('produces stable non-empty buckets for rolling_180d on a long path', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `s${i}`);
    const buckets = partitionCriticalPathIntoSeasonBuckets(ids, 'rolling_180d');
    expect(buckets.near.length + buckets.mid.length + buckets.far.length).toBe(10);
    expect(buckets.near.length).toBeGreaterThanOrEqual(1);
    expect(buckets.far.length).toBeGreaterThanOrEqual(1);
  });
});

describe('partitionCriticalPathIntoCalendarSeasonBuckets', () => {
  it('maps UTC day indices consistently for ISO dates', () => {
    expect(utcDayIndexFromIsoDate('2026-01-01')).toBeLessThan(utcDayIndexFromIsoDate('2026-12-31'));
  });

  it('falls back to list split when end_date is before start_date', () => {
    const ids = ['a', 'b', 'c'];
    const nodes = new Map(ids.map((id) => [id, {}] as const));
    const bad = partitionCriticalPathForTimelineDisplay({
      criticalPathIds: ids,
      nodesById: nodes,
      seasonPreset: 'rolling_90d',
      planHorizon: { start_date: '2026-06-01', end_date: '2026-01-01' },
    });
    expect(bad).toEqual(partitionCriticalPathIntoSeasonBuckets(ids, 'rolling_90d'));
  });

  it('partitions by cumulative target_window_days within inclusive plan span', () => {
    const ids = ['a', 'b', 'c'];
    const nodes = new Map([
      ['a', { target_window_days: 40 }],
      ['b', { target_window_days: 40 }],
      ['c', { target_window_days: 40 }],
    ] as const);
    const out = partitionCriticalPathIntoCalendarSeasonBuckets({
      criticalPathIds: ids,
      nodesById: nodes,
      planHorizon: { start_date: '2026-01-01', end_date: '2026-01-31' },
      seasonPreset: 'rolling_90d',
    });
    expect(out.near.length + out.mid.length + out.far.length).toBe(3);
    expect(out.near.length).toBeGreaterThanOrEqual(1);
  });
});
