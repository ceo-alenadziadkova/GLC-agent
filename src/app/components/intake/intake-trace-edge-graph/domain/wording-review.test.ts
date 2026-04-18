import { describe, expect, it } from 'vitest';

import {
  buildWordingReviewItems,
  computeAverageWordingScore,
  filterVisibleWordingItems,
} from './wording-review';

describe('wording-review', () => {
  it('builds items and supports high-only filter', () => {
    const items = buildWordingReviewItems({
      ids: ['q1', 'q2'],
      resolveCanonLabel: id => (id === 'q1' ? 'Is this clear question?' : 'Other'),
      resolveDraftLabel: id => (id === 'q1' ? 'Other / misc' : 'n/a'),
      resolvePublishedLabel: () => null,
      scoringMode: 'normal',
    });

    expect(items.length).toBeGreaterThan(0);
    const highOnly = filterVisibleWordingItems(items, true);
    expect(highOnly.every(item => item.severity === 'high')).toBe(true);
  });

  it('returns 100 when there are no issues', () => {
    expect(computeAverageWordingScore([])).toBe(100);
  });
});

