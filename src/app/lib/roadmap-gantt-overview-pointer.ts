/**
 * Convert a pointer X coordinate inside the overview track into a normalized scroll ratio
 * in `[0, 1]`. Returns `null` when the track has no measurable width — callers should treat
 * this as a no-op.
 */
export function computePointerScrollRatio(args: {
  clientX: number;
  rect: { left: number; width: number };
}): number | null {
  const { clientX, rect } = args;
  if (rect.width <= 0) return null;
  const ratio = (clientX - rect.left) / rect.width;
  return Math.min(Math.max(ratio, 0), 1);
}
