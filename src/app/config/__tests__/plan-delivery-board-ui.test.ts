import { afterEach, describe, expect, it } from 'vitest';

import { APP_FEATURE_FLAGS } from '../app-feature-flags';
import { planOrchestrationIncludeTimelineForUnifiedPlanView } from '../plan-delivery-board-ui';

describe('planOrchestrationIncludeTimelineForUnifiedPlanView', () => {
  const originalDefer = APP_FEATURE_FLAGS.planBoardDeferTimelineFetchOnBoardTabEnabled;

  afterEach(() => {
    (
      APP_FEATURE_FLAGS as { planBoardDeferTimelineFetchOnBoardTabEnabled: boolean }
    ).planBoardDeferTimelineFetchOnBoardTabEnabled = originalDefer;
  });

  it('returns false for board and table when defer flag is on', () => {
    (APP_FEATURE_FLAGS as { planBoardDeferTimelineFetchOnBoardTabEnabled: boolean }).planBoardDeferTimelineFetchOnBoardTabEnabled =
      true;
    expect(planOrchestrationIncludeTimelineForUnifiedPlanView('board')).toBe(false);
    expect(planOrchestrationIncludeTimelineForUnifiedPlanView('table')).toBe(false);
  });

  it('returns true for roadmap when defer flag is on', () => {
    (APP_FEATURE_FLAGS as { planBoardDeferTimelineFetchOnBoardTabEnabled: boolean }).planBoardDeferTimelineFetchOnBoardTabEnabled =
      true;
    expect(planOrchestrationIncludeTimelineForUnifiedPlanView('roadmap')).toBe(true);
  });

  it('returns true for board when defer flag is off', () => {
    (APP_FEATURE_FLAGS as { planBoardDeferTimelineFetchOnBoardTabEnabled: boolean }).planBoardDeferTimelineFetchOnBoardTabEnabled =
      false;
    expect(planOrchestrationIncludeTimelineForUnifiedPlanView('board')).toBe(true);
  });
});
