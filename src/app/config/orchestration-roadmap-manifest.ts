/**
 * Roadmap manifest enums for Strategy Lab UI.
 * Keep aligned with `server/src/config/orchestration-roadmap-presets.ts`.
 */

export const ORCHESTRATION_CHANGE_SCENARIOS = ['integrate_existing', 'build_new', 'hybrid'] as const;
export type OrchestrationChangeScenario = (typeof ORCHESTRATION_CHANGE_SCENARIOS)[number];

export const ORCHESTRATION_SEASON_PRESETS = [
  'rolling_30d',
  'rolling_90d',
  'rolling_180d',
] as const;
export type OrchestrationSeasonPreset = (typeof ORCHESTRATION_SEASON_PRESETS)[number];

/** Aligned with `server/src/config/roadmap-manifest-policy.ts` preview hints. */
export const ORCHESTRATION_PREVIEW_COMPRESSION_HINTS = ['none', 'mild', 'moderate', 'strong'] as const;
export type OrchestrationPreviewCompressionHint = (typeof ORCHESTRATION_PREVIEW_COMPRESSION_HINTS)[number];

export const ORCHESTRATION_PREVIEW_LANE_DENSITY_BANDS = ['sparse', 'standard', 'dense'] as const;
export type OrchestrationPreviewLaneDensityBand = (typeof ORCHESTRATION_PREVIEW_LANE_DENSITY_BANDS)[number];
