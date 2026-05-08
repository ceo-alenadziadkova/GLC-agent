import type {
  OrchestrationChangeScenario,
  OrchestrationPlanHorizon,
  OrchestrationSeasonPreset,
} from '../config/orchestration-roadmap-manifest';
import {
  encodeManifestChangeSignature,
  manifestSignatureArgsFromDraft,
} from '../config/orchestration-roadmap-manifest';

/** Single entry point for “current draft” manifest signatures (Strategy Lab + wizard). */
export function manifestChangeSignatureFromDraft(
  draft: {
    change_scenario: OrchestrationChangeScenario;
    season_preset: OrchestrationSeasonPreset;
    plan_start_raw: string;
    plan_end_raw: string;
  },
  hintsDigest?: string | null,
): string {
  return encodeManifestChangeSignature({
    ...manifestSignatureArgsFromDraft(draft),
    hints_digest: hintsDigest ? hintsDigest.trim() : undefined,
  });
}

/**
 * Saved / hydrated manifest rows: same signing path as drafts (ISO horizon normalizes via manifestSignatureArgsFromDraft).
 */
export function manifestChangeSignatureFromPayload(payload: {
  change_scenario: OrchestrationChangeScenario;
  season_preset: OrchestrationSeasonPreset;
  plan_horizon?: OrchestrationPlanHorizon | null;
}): string {
  return manifestChangeSignatureFromDraft({
    change_scenario: payload.change_scenario,
    season_preset: payload.season_preset,
    plan_start_raw: payload.plan_horizon?.start_date ?? '',
    plan_end_raw: payload.plan_horizon?.end_date ?? '',
  });
}
