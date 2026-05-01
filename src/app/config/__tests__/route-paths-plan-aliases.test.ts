import { describe, expect, it } from 'vitest';

import { APP_ROUTE_SEGMENTS as P } from '@glc/intake-core';

import { buildAppRoute } from '../route-paths';

describe('buildAppRoute plan aliases', () => {
  const id = '11111111-1111-1111-1111-111111111111';

  it('builds consultant /plan/:id defaulting to roadmap path without query', () => {
    expect(buildAppRoute.plan(id)).toBe(`/${P.planById.replace(':id', id)}`);
  });

  it('adds view=timeline for timeline branch', () => {
    expect(buildAppRoute.plan(id, 'timeline')).toBe(`/${P.planById.replace(':id', id)}?view=timeline`);
  });

  it('mirrors portal plan paths', () => {
    expect(buildAppRoute.portalPlan(id)).toBe(`/${P.portalPlanById.replace(':id', id)}`);
    expect(buildAppRoute.portalPlan(id, 'timeline')).toBe(`/${P.portalPlanById.replace(':id', id)}?view=timeline`);
  });
});
