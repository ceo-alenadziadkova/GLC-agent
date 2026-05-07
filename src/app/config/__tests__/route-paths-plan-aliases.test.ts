import { afterEach, describe, expect, it } from 'vitest';

import { APP_ROUTE_SEGMENTS as P, PLAN_WORKSPACE_SURFACE_SEGMENTS as S } from '@glc/intake-core';

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

  it('builds consultant /plan/:id defaulting to roadmap when Board rollout is below GA', () => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode =
      'internal';
    expect(buildAppRoute.plan(id)).toBe(`/${P.planById.replace(':id', id)}/${S.roadmap}`);
  });

  it('builds consultant /plan/:id defaulting to board at GA rollout', () => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode = 'ga';
    expect(buildAppRoute.plan(id)).toBe(`/${P.planById.replace(':id', id)}/${S.board}`);
  });

  it('adds roadmap segment for roadmap branch', () => {
    expect(buildAppRoute.plan(id, 'roadmap')).toBe(`/${P.planById.replace(':id', id)}/${S.roadmap}`);
  });

  it('adds table segment for table branch', () => {
    expect(buildAppRoute.plan(id, 'table')).toBe(`/${P.planById.replace(':id', id)}/${S.table}`);
  });

  it('mirrors portal plan paths', () => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode =
      'internal';
    expect(buildAppRoute.portalPlan(id)).toBe(`/${P.portalPlanById.replace(':id', id)}/${S.roadmap}`);
    expect(buildAppRoute.portalPlan(id, 'roadmap')).toBe(`/${P.portalPlanById.replace(':id', id)}/${S.roadmap}`);
  });

  it('builds consultant and portal Strategy Lab studio paths under /lab', () => {
    expect(buildAppRoute.planStudio(id)).toBe(`/${P.labById.replace(':id', id)}`);
    expect(buildAppRoute.portalPlanStudio(id)).toBe(`/${P.portalLabById.replace(':id', id)}`);
  });
});
