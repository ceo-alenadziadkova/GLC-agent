import { describe, expect, it } from 'vitest';

import { computeJumpToTodayScrollLeft } from '../roadmap-gantt-jump-to-today';

describe('computeJumpToTodayScrollLeft', () => {
  it('returns 0 when there is no scrollable area', () => {
    expect(
      computeJumpToTodayScrollLeft({
        now: 100,
        defaultStart: 0,
        rangeMs: 1000,
        scrollWidth: 800,
        clientWidth: 800,
      }),
    ).toBe(0);
  });

  it('returns 0 when range is zero', () => {
    expect(
      computeJumpToTodayScrollLeft({
        now: 100,
        defaultStart: 0,
        rangeMs: 0,
        scrollWidth: 1600,
        clientWidth: 800,
      }),
    ).toBe(0);
  });

  it('clamps before the range to 0', () => {
    expect(
      computeJumpToTodayScrollLeft({
        now: -100,
        defaultStart: 0,
        rangeMs: 1000,
        scrollWidth: 1600,
        clientWidth: 800,
      }),
    ).toBe(0);
  });

  it('clamps the ratio to 1 past the range, keeping the marker centred', () => {
    // ratio is clamped to 1, target = maxScroll*1 - clientWidth/2 = 800 - 400 = 400
    expect(
      computeJumpToTodayScrollLeft({
        now: 5000,
        defaultStart: 0,
        rangeMs: 1000,
        scrollWidth: 1600,
        clientWidth: 800,
      }),
    ).toBe(400);
  });

  it('centres the now marker for mid-range times', () => {
    // ratio 0.5, maxScroll 800, target = 800*0.5 - 800/2 = 0
    expect(
      computeJumpToTodayScrollLeft({
        now: 500,
        defaultStart: 0,
        rangeMs: 1000,
        scrollWidth: 1600,
        clientWidth: 800,
      }),
    ).toBe(0);
    // ratio 0.75, maxScroll 800, target = 800*0.75 - 400 = 200
    expect(
      computeJumpToTodayScrollLeft({
        now: 750,
        defaultStart: 0,
        rangeMs: 1000,
        scrollWidth: 1600,
        clientWidth: 800,
      }),
    ).toBe(200);
  });
});
