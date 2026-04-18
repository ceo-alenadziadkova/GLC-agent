/**
 * Pure statistics helpers for domain benchmark snapshots (ADR-DOMAIN-BENCHMARKS).
 */

/** Linear interpolation quantile on sorted ascending array; q in [0, 1]. */
export function quantileLinearSorted(sortedAsc: number[], q: number): number {
  const n = sortedAsc.length;
  if (n === 0) return NaN;
  if (n === 1) return sortedAsc[0]!;
  const clamped = Math.min(1, Math.max(0, q));
  const pos = (n - 1) * clamped;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedAsc[lo]!;
  const a = sortedAsc[lo]!;
  const b = sortedAsc[hi]!;
  return a + (b - a) * (pos - lo);
}

export interface PercentileBundle {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export function percentilesFromSorted(sortedAsc: number[]): PercentileBundle {
  return {
    p25: quantileLinearSorted(sortedAsc, 0.25),
    p50: quantileLinearSorted(sortedAsc, 0.5),
    p75: quantileLinearSorted(sortedAsc, 0.75),
    p90: quantileLinearSorted(sortedAsc, 0.9),
  };
}

export function average(nums: number[]): number {
  if (nums.length === 0) return NaN;
  let s = 0;
  for (const x of nums) s += x;
  return s / nums.length;
}

/** Median via 0.5 quantile. */
export function medianSorted(sortedAsc: number[]): number {
  return quantileLinearSorted(sortedAsc, 0.5);
}
