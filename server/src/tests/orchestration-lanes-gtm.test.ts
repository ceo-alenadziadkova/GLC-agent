import { describe, expect, it } from 'vitest';

import { mapStrategyInitiativeDomainToLane } from '../config/orchestration-lanes.js';

describe('orchestration lanes — GTM mapping', () => {
  it('maps sales and customer_success initiatives to gtm_sales', () => {
    expect(mapStrategyInitiativeDomainToLane('sales')).toBe('gtm_sales');
    expect(mapStrategyInitiativeDomainToLane('customer_success')).toBe('gtm_sales');
  });

  it('maps research initiatives to the research lane', () => {
    expect(mapStrategyInitiativeDomainToLane('research')).toBe('research');
  });
});
