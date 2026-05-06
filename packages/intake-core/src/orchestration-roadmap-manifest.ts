/**
 * Roadmap manifest enums and change-signature helpers (shared app + server).
 * Keep aligned with `server/src/config/orchestration-roadmap-presets.ts`.
 */

export const ORCHESTRATION_CHANGE_SCENARIOS = ['integrate_existing', 'build_new', 'hybrid'] as const;
export type OrchestrationChangeScenario = (typeof ORCHESTRATION_CHANGE_SCENARIOS)[number];
export const ORCHESTRATION_MANIFEST_SCHEMA_VERSION = 2 as const;
export type OrchestrationManifestSchemaVersion = typeof ORCHESTRATION_MANIFEST_SCHEMA_VERSION;

/** Optional calendar window on roadmap manifest (ISO YYYY-MM-DD); matches server `RoadmapPlanHorizon`. */
export type OrchestrationPlanHorizon = {
  start_date: string;
  end_date: string;
};

export const ORCHESTRATION_PLAN_HORIZON_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Returns a valid horizon or `undefined` when fields are empty or invalid (client omits key on POST). */
export function parseOptionalOrchestrationPlanHorizon(start: string, end: string): OrchestrationPlanHorizon | undefined {
  const s = start.trim();
  const e = end.trim();
  if (!s || !e || !ORCHESTRATION_PLAN_HORIZON_ISO.test(s) || !ORCHESTRATION_PLAN_HORIZON_ISO.test(e) || s > e) {
    return undefined;
  }
  return { start_date: s, end_date: e };
}

export function manifestPlanHorizonKey(horizon: OrchestrationPlanHorizon | null | undefined): string {
  if (!horizon) return '';
  return `${horizon.start_date}::${horizon.end_date}`;
}

export const ORCHESTRATION_SEASON_PRESETS = [
  'rolling_30d',
  'rolling_90d',
  'rolling_180d',
] as const;
export type OrchestrationSeasonPreset = (typeof ORCHESTRATION_SEASON_PRESETS)[number];

export function encodeManifestChangeSignature(args: {
  change_scenario: OrchestrationChangeScenario;
  season_preset: OrchestrationSeasonPreset;
  plan_horizon?: OrchestrationPlanHorizon | null;
  /** Raw inputs when horizon is incomplete (tracks typing vs saved). */
  plan_start_raw?: string;
  plan_end_raw?: string;
}): string {
  const explicit = manifestPlanHorizonKey(args.plan_horizon ?? null);
  if (explicit) return `${args.change_scenario}::${args.season_preset}::${explicit}`;
  const raw =
    `${(args.plan_start_raw ?? '').trim()}::${(args.plan_end_raw ?? '').trim()}`;
  return `${args.change_scenario}::${args.season_preset}::${raw}`;
}

/** Normalizes horizon draft inputs before signing — avoids false "unsaved" when ISO dates match but raw strings differ. */
export function manifestSignatureArgsFromDraft(draft: {
  change_scenario: OrchestrationChangeScenario;
  season_preset: OrchestrationSeasonPreset;
  plan_start_raw: string;
  plan_end_raw: string;
}): {
  change_scenario: OrchestrationChangeScenario;
  season_preset: OrchestrationSeasonPreset;
  plan_horizon?: OrchestrationPlanHorizon | null;
  plan_start_raw?: string;
  plan_end_raw?: string;
} {
  const plan_horizon = parseOptionalOrchestrationPlanHorizon(draft.plan_start_raw, draft.plan_end_raw);
  if (plan_horizon) {
    return {
      change_scenario: draft.change_scenario,
      season_preset: draft.season_preset,
      plan_horizon,
      plan_start_raw: plan_horizon.start_date,
      plan_end_raw: plan_horizon.end_date,
    };
  }
  return {
    change_scenario: draft.change_scenario,
    season_preset: draft.season_preset,
    plan_horizon: undefined,
    plan_start_raw: draft.plan_start_raw.trim(),
    plan_end_raw: draft.plan_end_raw.trim(),
  };
}
export const ORCHESTRATION_RISK_TOLERANCE_PRESETS = ['low', 'medium', 'high'] as const;
export type OrchestrationRiskTolerancePreset = (typeof ORCHESTRATION_RISK_TOLERANCE_PRESETS)[number];

/** Aligned with `server/src/config/roadmap-manifest-policy.ts` preview hints. */
export const ORCHESTRATION_PREVIEW_COMPRESSION_HINTS = ['none', 'mild', 'moderate', 'strong'] as const;
export type OrchestrationPreviewCompressionHint = (typeof ORCHESTRATION_PREVIEW_COMPRESSION_HINTS)[number];

export const ORCHESTRATION_PREVIEW_LANE_DENSITY_BANDS = ['sparse', 'standard', 'dense'] as const;
export type OrchestrationPreviewLaneDensityBand = (typeof ORCHESTRATION_PREVIEW_LANE_DENSITY_BANDS)[number];
