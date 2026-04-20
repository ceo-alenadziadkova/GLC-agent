/**
 * Roadmap manifest enums: change scenario and season / horizon presets.
 * Keep literals here only — Zod and UI copy consume the same tuples.
 */

export const ROADMAP_CHANGE_SCENARIOS = ['integrate_existing', 'build_new', 'hybrid'] as const;

export type RoadmapChangeScenario = (typeof ROADMAP_CHANGE_SCENARIOS)[number];

/**
 * Planning window presets for execution compression and lane density (product-defined).
 */
export const ROADMAP_SEASON_PRESETS = [
  'rolling_30d',
  'rolling_90d',
  'rolling_180d',
] as const;

export type RoadmapSeasonPreset = (typeof ROADMAP_SEASON_PRESETS)[number];

export const ROADMAP_SEASON_TARGET_WINDOW_DAYS: Record<RoadmapSeasonPreset, number> = {
  rolling_30d: 30,
  rolling_90d: 90,
  rolling_180d: 180,
};
