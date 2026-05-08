import { describe, expect, it } from 'vitest';

import { computeOverviewWindowMetrics } from '../roadmap-gantt-overview-window';

describe('computeOverviewWindowMetrics', () => {
  it('returns full-width window when there is no scrollable content', () => {
    expect(computeOverviewWindowMetrics({ left: 0, max: 1, clientWidth: 0 })).toEqual({
      hasScrollableTimeline: false,
      widthPct: 100,
      leftPct: 0,
    });
  });

  it('computes proportional width and left when scrollable', () => {
    const metrics = computeOverviewWindowMetrics({ left: 200, max: 800, clientWidth: 200 });
    expect(metrics.hasScrollableTimeline).toBe(true);
    expect(metrics.widthPct).toBeCloseTo(20, 5);
    expect(metrics.leftPct).toBeCloseTo(20, 5);
  });

  it('clamps width and left at 100', () => {
    const metrics = computeOverviewWindowMetrics({ left: 10000, max: 100, clientWidth: 100000 });
    expect(metrics.hasScrollableTimeline).toBe(true);
    expect(metrics.widthPct).toBeLessThanOrEqual(100);
    expect(metrics.leftPct).toBeLessThanOrEqual(100);
  });
});
