import { afterEach, describe, expect, it } from 'vitest';

import { APP_ROUTE_SEGMENTS as P } from '@glc/intake-core';

import type { FeatureRolloutMode } from '../app-feature-flags';
import { APP_FEATURE_FLAGS } from '../app-feature-flags';
import { buildAppRoute } from '../route-paths';

describe('buildAppRoute plan aliases', () => {
  const id = '11111111-1111-1111-1111-111111111111';
  const originalBoardMode = APP_FEATURE_FLAGS.planDeliveryBoardRolloutMode;

  afterEach(() => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode =
      originalBoardMode;
  });

  it('builds consultant /plan/:id defaulting to timeline when Board rollout is below GA', () => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode =
      'internal';
    expect(buildAppRoute.plan(id)).toBe(`/${P.planById.replace(':id', id)}?view=timeline`);
  });

  it('builds consultant /plan/:id defaulting to board at GA rollout', () => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode = 'ga';
    expect(buildAppRoute.plan(id)).toBe(`/${P.planById.replace(':id', id)}?view=board`);
  });

  it('adds view=roadmap for roadmap branch', () => {
    expect(buildAppRoute.plan(id, 'roadmap')).toBe(`/${P.planById.replace(':id', id)}?view=roadmap`);
  });

  it('mirrors portal plan paths', () => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode =
      'internal';
    expect(buildAppRoute.portalPlan(id)).toBe(`/${P.portalPlanById.replace(':id', id)}?view=timeline`);
    expect(buildAppRoute.portalPlan(id, 'roadmap')).toBe(`/${P.portalPlanById.replace(':id', id)}?view=roadmap`);
  });
});
