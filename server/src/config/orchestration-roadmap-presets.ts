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
  'q1_90d',
  'q2_90d',
  'q3_90d',
  'q4_90d',
  'rolling_90d',
  'milestone_phased',
] as const;

export type RoadmapSeasonPreset = (typeof ROADMAP_SEASON_PRESETS)[number];
