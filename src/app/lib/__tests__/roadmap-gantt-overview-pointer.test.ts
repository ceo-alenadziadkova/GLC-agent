import { describe, expect, it } from 'vitest';

import { computePointerScrollRatio } from '../roadmap-gantt-overview-pointer';

describe('computePointerScrollRatio', () => {
  it('returns null when track has no width', () => {
    expect(computePointerScrollRatio({ clientX: 100, rect: { left: 0, width: 0 } })).toBeNull();
    expect(computePointerScrollRatio({ clientX: 100, rect: { left: 0, width: -10 } })).toBeNull();
  });

  it('clamps below 0', () => {
    expect(computePointerScrollRatio({ clientX: -50, rect: { left: 0, width: 200 } })).toBe(0);
  });

  it('clamps above 1', () => {
    expect(computePointerScrollRatio({ clientX: 500, rect: { left: 0, width: 200 } })).toBe(1);
  });

  it('returns the linear ratio for in-range coordinates', () => {
    expect(computePointerScrollRatio({ clientX: 50, rect: { left: 0, width: 200 } })).toBeCloseTo(0.25);
    expect(computePointerScrollRatio({ clientX: 150, rect: { left: 50, width: 200 } })).toBeCloseTo(0.5);
  });
});
