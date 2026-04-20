import { describe, expect, it } from 'vitest';

import { partitionCriticalPathIntoSeasonBuckets } from '../config/orchestration-timeline-policy.js';

describe('partitionCriticalPathIntoSeasonBuckets', () => {
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
});
