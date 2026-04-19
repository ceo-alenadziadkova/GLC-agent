/**
 * Roadmap manifest enums for Strategy Lab UI.
 * Keep aligned with `server/src/config/orchestration-roadmap-presets.ts`.
 */

export const ORCHESTRATION_CHANGE_SCENARIOS = ['integrate_existing', 'build_new', 'hybrid'] as const;
export type OrchestrationChangeScenario = (typeof ORCHESTRATION_CHANGE_SCENARIOS)[number];

export const ORCHESTRATION_SEASON_PRESETS = [
  'q1_90d',
  'q2_90d',
  'q3_90d',
  'q4_90d',
  'rolling_90d',
  'milestone_phased',
] as const;
export type OrchestrationSeasonPreset = (typeof ORCHESTRATION_SEASON_PRESETS)[number];
