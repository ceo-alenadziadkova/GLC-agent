import { describe, expect, it } from 'vitest';

import { getLaneRegistryEntry, sortLaneIdsByRegistry } from '../config/orchestration-lane-registry.js';

describe('orchestration-lane-registry', () => {
  it('sorts lanes by priority', () => {
    expect(sortLaneIdsByRegistry(['seo', 'product_change', 'tech_delivery'])).toEqual([
      'product_change',
      'tech_delivery',
      'seo',
    ]);
  });

  it('returns fallback meta for unknown lane', () => {
    const m = getLaneRegistryEntry('research');
    expect(m.priorityOrder).toBe(999);
    expect(m.copyKey).toBe('research');
  });
});
