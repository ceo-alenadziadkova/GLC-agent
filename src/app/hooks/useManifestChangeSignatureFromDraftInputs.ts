import { useMemo } from 'react';

import type {
  OrchestrationChangeScenario,
  OrchestrationSeasonPreset,
} from '../config/orchestration-roadmap-manifest';
import { manifestChangeSignatureFromDraft } from '../lib/manifest-change-signature';

/** Shared manifest signing input used by Strategy Lab panel and portal manifest wizard. */
export function useManifestChangeSignatureFromDraftInputs(deps: {
  scenario: OrchestrationChangeScenario;
  season: OrchestrationSeasonPreset;
  planHorizonStart: string;
  planHorizonEnd: string;
}): string {
  const { scenario, season, planHorizonStart, planHorizonEnd } = deps;
  return useMemo(
    () =>
      manifestChangeSignatureFromDraft({
        change_scenario: scenario,
        season_preset: season,
        plan_start_raw: planHorizonStart,
        plan_end_raw: planHorizonEnd,
      }),
    [scenario, season, planHorizonStart, planHorizonEnd],
  );
}
