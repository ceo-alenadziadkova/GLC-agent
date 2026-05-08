import { describe, expect, it } from 'vitest';

import { timeBucketForSeasonIndexOneBased } from '../orchestration-time-buckets';

describe('timeBucketForSeasonIndexOneBased', () => {
  it('maps 1-based indexes to buckets', () => {
    expect(timeBucketForSeasonIndexOneBased(1)).toBe('now');
    expect(timeBucketForSeasonIndexOneBased(2)).toBe('next');
    expect(timeBucketForSeasonIndexOneBased(3)).toBe('later');
    expect(timeBucketForSeasonIndexOneBased(999)).toBe('later');
  });
});
