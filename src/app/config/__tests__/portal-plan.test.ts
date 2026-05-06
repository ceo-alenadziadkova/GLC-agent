import { afterEach, describe, expect, it } from 'vitest';

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

  it('defaults to roadmap while Delivery Board rollout is below GA', () => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode =
      'internal';
    expect(parsePortalPlanViewParam(null)).toBe('roadmap');
    expect(parsePortalPlanViewParam('')).toBe('roadmap');
    expect(parsePortalPlanViewParam('   ')).toBe('roadmap');
  });

  it('defaults to board when rollout mode is GA', () => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode = 'ga';
    expect(parsePortalPlanViewParam(null)).toBe('board');
    expect(parsePortalPlanViewParam('')).toBe('board');
  });

  it('parses roadmap, board, and table literals case-insensitively', () => {
    expect(parsePortalPlanViewParam('roadmap')).toBe('roadmap');
    expect(parsePortalPlanViewParam('Roadmap')).toBe('roadmap');
    expect(parsePortalPlanViewParam('board')).toBe('board');
    expect(parsePortalPlanViewParam('Board')).toBe('board');
    expect(parsePortalPlanViewParam('table')).toBe('table');
    expect(parsePortalPlanViewParam('Table')).toBe('table');
  });

  it('maps legacy timeline spellings to board at GA rollout', () => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode = 'ga';
    expect(parsePortalPlanViewParam('timeline')).toBe('board');
    expect(parsePortalPlanViewParam('Timeline')).toBe('board');
  });

  it('maps legacy timeline spellings to roadmap when board rollout is below GA', () => {
    (APP_FEATURE_FLAGS as { planDeliveryBoardRolloutMode: FeatureRolloutMode }).planDeliveryBoardRolloutMode =
      'internal';
    expect(parsePortalPlanViewParam('timeline')).toBe('roadmap');
  });

  it('falls back to board on unknown literal view values', () => {
    expect(parsePortalPlanViewParam('anything_else')).toBe('board');
  });
});

describe('defaultPortalPlanSurfaceFromRollout', () => {
  it('matches GA semantics', () => {
    expect(defaultPortalPlanSurfaceFromRollout('ga')).toBe('board');
    expect(defaultPortalPlanSurfaceFromRollout('pilot')).toBe('roadmap');
  });
});
