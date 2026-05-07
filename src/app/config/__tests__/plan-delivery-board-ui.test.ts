import { describe, expect, it } from 'vitest';
import { planOrchestrationIncludeTimelineForUnifiedPlanView } from '../plan-delivery-board-ui';

describe('planOrchestrationIncludeTimelineForUnifiedPlanView', () => {
  it('returns false for board and table', () => {
    expect(planOrchestrationIncludeTimelineForUnifiedPlanView('board')).toBe(false);
    expect(planOrchestrationIncludeTimelineForUnifiedPlanView('table')).toBe(false);
  });

  it('returns true for roadmap', () => {
    expect(planOrchestrationIncludeTimelineForUnifiedPlanView('roadmap')).toBe(true);
  });
});
