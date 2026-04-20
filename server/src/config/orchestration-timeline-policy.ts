/**
 * Client timeline read-model policy (projection + transport limits).
 * Keep all tunables here (no magic numbers in services/controllers).
 */
import type { RoadmapPlanHorizon } from '../schemas/roadmap-manifest.js';
import type { RoadmapSeasonPreset } from './orchestration-roadmap-presets.js';
import { ROADMAP_SEASON_PRESETS } from './orchestration-roadmap-presets.js';

export const ORCHESTRATION_TIMELINE_POLICY = {
  maxDependencyRows: 24,
  maxTopActionsPerWindow: 7,
  staleManifestStatusEnabled: true,
  /** Snapshot list fetch size to resolve latest manifest id vs pack (timeline read model). */
  latestManifestSnapshotsPeekLimit: 1,
  /**
   * Minimum default per-node window (days) when building a calendar partition without `target_window_days`.
   * Actual default also scales with `ceil(inclusiveSpan / max(1, criticalPathLength))`.
   */
  calendarPartitionMinDefaultWindowDays: 1,
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
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** UTC midnight day index for Y-M-D only (stable, no local TZ). */
export function utcDayIndexFromIsoDate(iso: string): number {
  if (!ISO_DATE_ONLY.test(iso)) {
    throw new TypeError(`Invalid ISO calendar date: ${iso}`);
  }
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

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

export type OrchestrationNodePartitionHint = {
  target_window_days?: number;
};

/**
 * Partition critical-path node ids into near/mid/far using a calendar plan window and the same weight family as
 * {@link partitionCriticalPathIntoSeasonBuckets}, but cuts are on **day offsets** within `[start_date, end_date]` inclusive.
 * Each node is placed by the **start offset** of its window along the path (cumulative `target_window_days`).
 */
export function partitionCriticalPathIntoCalendarSeasonBuckets(args: {
  criticalPathIds: readonly string[];
  nodesById: ReadonlyMap<string, OrchestrationNodePartitionHint>;
  planHorizon: RoadmapPlanHorizon;
  seasonPreset: RoadmapSeasonPreset | null | undefined;
}): { near: string[]; mid: string[]; far: string[] } {
  const ids = args.criticalPathIds;
  if (ids.length === 0) {
    return { near: [], mid: [], far: [] };
  }
  let startIdx: number;
  let endIdx: number;
  try {
    startIdx = utcDayIndexFromIsoDate(args.planHorizon.start_date);
    endIdx = utcDayIndexFromIsoDate(args.planHorizon.end_date);
  } catch {
    return partitionCriticalPathIntoSeasonBuckets(ids, args.seasonPreset);
  }
  if (endIdx < startIdx) {
    return partitionCriticalPathIntoSeasonBuckets(ids, args.seasonPreset);
  }
  const inclusiveSpan = endIdx - startIdx + 1;
  if (inclusiveSpan < 1) {
    return partitionCriticalPathIntoSeasonBuckets(ids, args.seasonPreset);
  }

  const preset = args.seasonPreset ?? null;
  const [wn, wm] =
    preset != null
      ? ORCHESTRATION_TIMELINE_SEASON_BUCKET_WEIGHTS[preset]
      : DEFAULT_SEASON_WEIGHTS;

  const n = inclusiveSpan;
  const nearEndExclusive = Math.max(1, Math.min(n, Math.ceil(n * wn)));
  const midEndExclusive = Math.max(nearEndExclusive, Math.min(n, Math.ceil(n * (wn + wm))));

  const defaultWindow = Math.max(
    ORCHESTRATION_TIMELINE_POLICY.calendarPartitionMinDefaultWindowDays,
    Math.floor(inclusiveSpan / Math.max(1, ids.length)),
  );

  const near: string[] = [];
  const mid: string[] = [];
  const far: string[] = [];

  let cumulativeOffset = 0;
  for (const id of ids) {
    const hint = args.nodesById.get(id);
    const dur =
      hint?.target_window_days != null && hint.target_window_days > 0
        ? hint.target_window_days
        : defaultWindow;

    const dayIndex = Math.min(Math.max(0, cumulativeOffset), inclusiveSpan - 1);
    if (dayIndex < nearEndExclusive) {
      near.push(id);
    } else if (dayIndex < midEndExclusive) {
      mid.push(id);
    } else {
      far.push(id);
    }
    cumulativeOffset += dur;
  }

  return { near, mid, far };
}

/**
 * Choose calendar partition when `plan_horizon` is present and valid; otherwise preset-only list split.
 */
export function partitionCriticalPathForTimelineDisplay(args: {
  criticalPathIds: readonly string[];
  nodesById: ReadonlyMap<string, OrchestrationNodePartitionHint>;
  seasonPreset: RoadmapSeasonPreset | null | undefined;
  planHorizon: RoadmapPlanHorizon | null | undefined;
}): { near: string[]; mid: string[]; far: string[] } {
  const h = args.planHorizon;
  if (!h) {
    return partitionCriticalPathIntoSeasonBuckets(args.criticalPathIds, args.seasonPreset);
  }
  const parsed = { start_date: h.start_date, end_date: h.end_date };
  if (!ISO_DATE_ONLY.test(parsed.start_date) || !ISO_DATE_ONLY.test(parsed.end_date) || parsed.end_date < parsed.start_date) {
    return partitionCriticalPathIntoSeasonBuckets(args.criticalPathIds, args.seasonPreset);
  }
  return partitionCriticalPathIntoCalendarSeasonBuckets({
    criticalPathIds: args.criticalPathIds,
    nodesById: args.nodesById,
    planHorizon: parsed,
    seasonPreset: args.seasonPreset,
  });
}

