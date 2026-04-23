import { describe, expect, it } from 'vitest';

import { getClientLaneRegistryEntry, sortLaneIdsByClientRegistry } from '../orchestration-lane-registry';

describe('orchestration-lane-registry (client)', () => {
  it('sorts by registry priority', () => {
    expect(sortLaneIdsByClientRegistry(['seo', 'gtm_sales', 'product_change', 'tech_delivery'])).toEqual([
      'product_change',
      'tech_delivery',
      'gtm_sales',
      'seo',
    ]);
  });

  it('resolves research lane and unknown fallback', () => {
    expect(getClientLaneRegistryEntry('research').priorityOrder).toBe(45);
    const unknown = getClientLaneRegistryEntry('future_lane');
    expect(unknown.priorityOrder).toBe(999);
    expect(unknown.copyKey).toBe('future_lane');
  });

  it('orders research between seo and processes_automation by priority', () => {
    expect(sortLaneIdsByClientRegistry(['processes_automation', 'seo', 'research'])).toEqual(['seo', 'research', 'processes_automation']);
  });
});
