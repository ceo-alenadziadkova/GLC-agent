import { afterEach, describe, expect, it, vi } from 'vitest';

import type { FeatureRolloutMode } from '../app-feature-flags';
import { APP_FEATURE_FLAGS } from '../app-feature-flags';
import {
  defaultPortalPlanSurfaceFromRollout,
  parsePortalPlanViewParam,
} from '../portal-plan';

describe('parsePortalPlanViewParam', () => {
  const originalBoardMode = APP_FEATURE_FLAGS.planDeliveryBoardRolloutMode;

  afterEach(() => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode =
      originalBoardMode;
  });

  it('defaults to timeline while Delivery Board rollout is below GA', () => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode =
      'internal';
    expect(parsePortalPlanViewParam(null)).toBe('timeline');
    expect(parsePortalPlanViewParam('')).toBe('timeline');
    expect(parsePortalPlanViewParam('   ')).toBe('timeline');
  });

  it('defaults to board when rollout mode is GA', () => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode = 'ga';
    expect(parsePortalPlanViewParam(null)).toBe('board');
    expect(parsePortalPlanViewParam('')).toBe('board');
  });

  it('parses roadmap and board literals case-insensitively', () => {
    expect(parsePortalPlanViewParam('roadmap')).toBe('roadmap');
    expect(parsePortalPlanViewParam('Roadmap')).toBe('roadmap');
    expect(parsePortalPlanViewParam('board')).toBe('board');
    expect(parsePortalPlanViewParam('Board')).toBe('board');
  });

  it('accepts timeline spellings used in older redirects', () => {
    expect(parsePortalPlanViewParam('timeline')).toBe('timeline');
    expect(parsePortalPlanViewParam('Timeline')).toBe('timeline');
  });

  it('falls back to timeline on unknown literal view values', () => {
    expect(parsePortalPlanViewParam('anything_else')).toBe('timeline');
  });
});

describe('defaultPortalPlanSurfaceFromRollout', () => {
  it('matches GA semantics', () => {
    expect(defaultPortalPlanSurfaceFromRollout('ga')).toBe('board');
    expect(defaultPortalPlanSurfaceFromRollout('pilot')).toBe('timeline');
  });
});
