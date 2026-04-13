import { describe, expect, it } from 'vitest';
import {
  average,
  medianSorted,
  percentilesFromSorted,
  quantileLinearSorted,
} from '../lib/benchmark-stats.js';

describe('benchmark-stats', () => {
  it('quantileLinearSorted matches linear interpolation', () => {
    const s = [10, 20, 30, 40];
    expect(quantileLinearSorted(s, 0)).toBe(10);
    expect(quantileLinearSorted(s, 1)).toBe(40);
    expect(quantileLinearSorted(s, 0.5)).toBe(25);
  });

  it('percentilesFromSorted on odd-length sample', () => {
    const s = [60, 70, 80, 90, 100];
    const p = percentilesFromSorted(s);
    expect(p.p50).toBe(80);
    expect(p.p90).toBeGreaterThanOrEqual(96);
  });

  it('average and medianSorted', () => {
    expect(average([2, 4, 6])).toBe(4);
    expect(medianSorted([1, 2, 9])).toBe(2);
  });
});
