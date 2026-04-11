/**
 * Multiplier applied to max points when a snapshot audit rule status is `partial`.
 * Override with SNAPSHOT_PARTIAL_SCORE_FACTOR (0–1 exclusive upper bound check: 0 < n <= 1).
 */

function readPartialScoreFactor(): number {
  const raw = process.env.SNAPSHOT_PARTIAL_SCORE_FACTOR?.trim();
  if (!raw) return 0.5;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 1) return 0.5;
  return n;
}

export const SNAPSHOT_PARTIAL_SCORE_FACTOR = readPartialScoreFactor();
