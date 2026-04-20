/**
 * Client timeline read-model policy (projection + transport limits).
 * Keep all tunables here (no magic numbers in services/controllers).
 */
import type { RoadmapSeasonPreset } from './orchestration-roadmap-presets.js';
import { ROADMAP_SEASON_PRESETS } from './orchestration-roadmap-presets.js';

export const ORCHESTRATION_TIMELINE_POLICY = {
  maxDependencyRows: 24,
  maxTopActionsPerWindow: 7,
  staleManifestStatusEnabled: true,
} as const;

/**
 * Near / mid / far weights for splitting the critical path (must sum to 1).
 * Driven by manifest `season_preset`; aligns planning-window presets with seasonal buckets.
 */
export const ORCHESTRATION_TIMELINE_SEASON_BUCKET_WEIGHTS: Record<
  RoadmapSeasonPreset,
  readonly [near: number, mid: number, far: number]
> = {
  /** Short window — emphasize near-term sequencing */
  rolling_30d: [0.5, 0.33, 0.17],
  /** Balanced thirds (matches legacy equal split) */
  rolling_90d: [1 / 3, 1 / 3, 1 / 3],
  /** Long horizon — more capacity in later bucket */
  rolling_180d: [0.25, 0.35, 0.4],
} as const;

const DEFAULT_SEASON_WEIGHTS = ORCHESTRATION_TIMELINE_SEASON_BUCKET_WEIGHTS[ROADMAP_SEASON_PRESETS[1]];

/**
 * Partition ordered critical-path ids into near/mid/far using preset weights (ceil cuts, same family as equal-thirds heuristic).
 */
export function partitionCriticalPathIntoSeasonBuckets(
  ids: readonly string[],
  seasonPreset: RoadmapSeasonPreset | null | undefined,
): { near: string[]; mid: string[]; far: string[] } {
  if (ids.length === 0) {
    return { near: [], mid: [], far: [] };
  }
  const [wn, wm] =
    seasonPreset != null
      ? ORCHESTRATION_TIMELINE_SEASON_BUCKET_WEIGHTS[seasonPreset]
      : DEFAULT_SEASON_WEIGHTS;
  const n = ids.length;
  const a = Math.max(1, Math.min(n, Math.ceil(n * wn)));
  const b = Math.max(a, Math.min(n, Math.ceil(n * (wn + wm))));
  return {
    near: ids.slice(0, a),
    mid: ids.slice(a, b),
    far: ids.slice(b),
  };
}

