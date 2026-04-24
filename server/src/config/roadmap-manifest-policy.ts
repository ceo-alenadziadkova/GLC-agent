/**
 * Deterministic rules for roadmap manifest preview (lanes, waiting list, UI hints).
 * No runtime env; consumed by roadmap-manifest-preview service only.
 */

import type { DomainKey } from '@glc/intake-core';
import { DOMAIN_KEYS } from '@glc/intake-core';

import type { RoadmapChangeScenario, RoadmapSeasonPreset } from './orchestration-roadmap-presets.js';
import type { OrchestrationLaneId } from './orchestration-lanes.js';
import { ORCHESTRATION_LANE_IDS, mapStrategyInitiativeDomainToLane } from './orchestration-lanes.js';
import type { StrategyInitiativeDomainKey } from './strategy-initiative-policy.js';

/** Max domains shown in preview waiting list (beyond current coverage). */
export const ROADMAP_MANIFEST_PREVIEW_WAITING_LIST_MAX = 6;
export const ROADMAP_MANIFEST_PREVIEW_SINGLE_DOMAIN_COUNT = 1;
export const ROADMAP_MANIFEST_PREVIEW_PARTIAL_COVERAGE_MAX = DOMAIN_KEYS.length - 1;

export const ROADMAP_EXECUTION_COMPRESSION_HINTS = ['none', 'mild', 'moderate', 'strong'] as const;
export type RoadmapExecutionCompressionHint = (typeof ROADMAP_EXECUTION_COMPRESSION_HINTS)[number];

export const ROADMAP_LANE_DENSITY_BANDS = ['sparse', 'standard', 'dense'] as const;
export type RoadmapLaneDensityBand = (typeof ROADMAP_LANE_DENSITY_BANDS)[number];

const SCENARIO_COMPRESSION: Record<RoadmapChangeScenario, RoadmapExecutionCompressionHint> = {
  integrate_existing: 'mild',
  build_new: 'moderate',
  hybrid: 'moderate',
};

const SEASON_DENSITY: Record<RoadmapSeasonPreset, RoadmapLaneDensityBand> = {
  rolling_30d: 'dense',
  rolling_90d: 'standard',
  rolling_180d: 'sparse',
};

export function roadmapPreviewCompressionHint(scenario: RoadmapChangeScenario): RoadmapExecutionCompressionHint {
  return SCENARIO_COMPRESSION[scenario];
}

export function roadmapPreviewLaneDensityBand(season: RoadmapSeasonPreset): RoadmapLaneDensityBand {
  return SEASON_DENSITY[season];
}

/** Lanes that will receive at least one initiative from current coverage (order stable). */
export function lanesIncludedForSelectedDomains(selectedDomains: readonly DomainKey[]): OrchestrationLaneId[] {
  const set = new Set<OrchestrationLaneId>();
  for (const d of selectedDomains) {
    set.add(mapStrategyInitiativeDomainToLane(d as StrategyInitiativeDomainKey));
  }
  return ORCHESTRATION_LANE_IDS.filter(id => set.has(id));
}

export function lanesCutForSelectedDomains(selectedDomains: readonly DomainKey[]): OrchestrationLaneId[] {
  const included = new Set(lanesIncludedForSelectedDomains(selectedDomains));
  return ORCHESTRATION_LANE_IDS.filter(id => !included.has(id));
}

/**
 * Domains not in current execution coverage, prioritized by recommended_domains then stable order.
 */
export function buildWaitingListDomains(args: {
  selectedDomains: readonly DomainKey[];
  recommendedDomains?: readonly DomainKey[] | undefined;
  maxItems?: number;
}): DomainKey[] {
  const max = args.maxItems ?? ROADMAP_MANIFEST_PREVIEW_WAITING_LIST_MAX;
  const selected = new Set(args.selectedDomains);
  const recommended = args.recommendedDomains ?? [];
  const out: DomainKey[] = [];
  const seen = new Set<string>();

  for (const d of recommended) {
    if (selected.has(d) || seen.has(d)) continue;
    seen.add(d);
    out.push(d);
    if (out.length >= max) return out;
  }

  for (const d of DOMAIN_KEYS) {
    if (selected.has(d) || seen.has(d)) continue;
    seen.add(d);
    out.push(d);
    if (out.length >= max) return out;
  }

  return out;
}

export function roadmapPreviewIsSingleDomainCoverage(selectedDomainCount: number): boolean {
  return selectedDomainCount === ROADMAP_MANIFEST_PREVIEW_SINGLE_DOMAIN_COUNT;
}

export function roadmapPreviewIsPartialCoverage(selectedDomainCount: number): boolean {
  return selectedDomainCount <= ROADMAP_MANIFEST_PREVIEW_PARTIAL_COVERAGE_MAX;
}
