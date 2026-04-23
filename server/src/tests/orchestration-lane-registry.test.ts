import { describe, expect, it } from 'vitest';

import { getLaneRegistryEntry, sortLaneIdsByRegistry } from '../config/orchestration-lane-registry.js';

describe('orchestration-lane-registry', () => {
  it('sorts lanes by priority', () => {
    expect(sortLaneIdsByRegistry(['seo', 'gtm_sales', 'product_change', 'tech_delivery'])).toEqual([
      'product_change',
      'tech_delivery',
      'gtm_sales',
      'seo',
    ]);
  });

  it('resolves research lane and fallback for unknown ids', () => {
    expect(getLaneRegistryEntry('research').priorityOrder).toBe(45);
    const unknown = getLaneRegistryEntry('future_lane');
    expect(unknown.priorityOrder).toBe(999);
    expect(unknown.copyKey).toBe('future_lane');
  });
});
