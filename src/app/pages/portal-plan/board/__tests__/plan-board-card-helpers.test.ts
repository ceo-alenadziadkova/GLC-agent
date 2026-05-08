import { describe, expect, it } from 'vitest';

import { buildPlanBoardPrimaryMarkers, type PlanBoardCardMetrics } from '../plan-board-card-helpers';

const BASE_METRICS: PlanBoardCardMetrics = {
  domainKey: 'marketing',
  priorityLevel: 'high',
  priorityBucket: null,
  priorityReasonLabel: null,
  quickWin: true,
  critical: false,
  assignee: null,
  dueState: 'no_due',
  dueDate: null,
};

describe('plan-board-card-helpers primary markers', () => {
  it('builds required marker set in fixed order', () => {
    const markers = buildPlanBoardPrimaryMarkers({
      metrics: BASE_METRICS,
      laneLabel: 'Marketing lane',
      domainLabel: 'Marketing',
    });
    expect(markers.map((m) => m.key)).toEqual(['domain_lane', 'priority', 'quick_win', 'critical']);
    expect(markers[0]?.label).toContain('Marketing');
    expect(markers[1]?.label).toBe('Priority: high');
  });

  it('falls back to unassigned lane marker when scope is missing', () => {
    const markers = buildPlanBoardPrimaryMarkers({
      metrics: { ...BASE_METRICS, quickWin: false, critical: true, priorityLevel: null },
      laneLabel: null,
      domainLabel: null,
    });
    expect(markers[0]?.label).toContain('Unassigned lane');
    expect(markers[2]?.label).toBe('Not quick win');
    expect(markers[3]?.label).toBe('Critical');
  });
});
