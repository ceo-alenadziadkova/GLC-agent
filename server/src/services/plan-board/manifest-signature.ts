import {
  encodeManifestChangeSignature,
  manifestSignatureArgsFromDraft,
  type OrchestrationChangeScenario,
  type OrchestrationSeasonPreset,
} from '@glc/intake-core';

import type { RoadmapManifestPayload } from '../../schemas/roadmap-manifest.js';

/** Stable manifest slice for `canonical_node_key` (Delivery Board ADR §3). */
export function roadmapManifestChangeSignature(payload: RoadmapManifestPayload): string {
  const start = payload.plan_horizon?.start_date ?? '';
  const end = payload.plan_horizon?.end_date ?? '';
  const args = manifestSignatureArgsFromDraft({
    change_scenario: payload.change_scenario as OrchestrationChangeScenario,
    season_preset: payload.season_preset as OrchestrationSeasonPreset,
    plan_start_raw: start,
    plan_end_raw: end,
  });
  return encodeManifestChangeSignature(args);
}
