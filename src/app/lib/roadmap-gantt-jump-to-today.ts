/**
 * Compute the target horizontal scroll position required to centre `now` inside the
 * timeline viewport.
 *
 * The result is clamped between `0` and `max(scrollWidth - clientWidth, 0)`. When the
 * timeline does not overflow horizontally (i.e. there is no scrollable area), the function
 * returns `0` so the caller can still issue a `scrollTo({ left: 0 })` without surprises.
 */
export function computeJumpToTodayScrollLeft(args: {
  now: number;
  defaultStart: number;
  rangeMs: number;
  scrollWidth: number;
  clientWidth: number;
}): number {
  const { now, defaultStart, rangeMs, scrollWidth, clientWidth } = args;
  const maxScroll = Math.max(scrollWidth - clientWidth, 0);
  if (maxScroll <= 0 || rangeMs <= 0) return 0;
  const ratio = (now - defaultStart) / rangeMs;
  const clampedRatio = Math.min(Math.max(ratio, 0), 1);
  const target = Math.floor(maxScroll * clampedRatio - clientWidth / 2);
  return Math.min(Math.max(target, 0), maxScroll);
}
