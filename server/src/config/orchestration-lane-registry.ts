/**
 * V9: display-oriented lane metadata. Domain mapping stays in `orchestration-lanes.ts` (build-time).
 * UI / graph layers read priority + labels from here to add lanes without forking the pack contract.
 * Keep the client mirror (`src/app/config/orchestration-lane-registry.ts`) in sync for `priorityOrder` / `copyKey` / `iconKey`.
 * Pairwise narrative strings remain in the SPA’s `orchestration-lane-pair-narratives` module, not in this file.
 */
import { ORCHESTRATION_LANE_IDS, type OrchestrationLaneId } from './orchestration-lanes.js';

export type LaneRegistryEntry = {
  /** Lower sorts first in portal graph / narratives. */
  priorityOrder: number;
  /** Key into `orchestration-roadmap-ui-copy` lane labels (same as lane id for standard lanes). */
  copyKey: string;
  iconKey: string;
};

const BASE: Record<OrchestrationLaneId, LaneRegistryEntry> = {
  product_change: { priorityOrder: 10, copyKey: 'product_change', iconKey: 'product' },
  tech_delivery: { priorityOrder: 20, copyKey: 'tech_delivery', iconKey: 'tech' },
  marketing_narrative: { priorityOrder: 30, copyKey: 'marketing_narrative', iconKey: 'marketing' },
  seo: { priorityOrder: 40, copyKey: 'seo', iconKey: 'seo' },
  processes_automation: { priorityOrder: 50, copyKey: 'processes_automation', iconKey: 'process' },
  risk_compliance: { priorityOrder: 60, copyKey: 'risk_compliance', iconKey: 'risk' },
};

/**
 * Research lane — reserved for future ADR; included so registry consumers never assume a fixed 6-tuple.
 * Not in `ORCHESTRATION_LANE_IDS` until product promotes domain mapping.
 */
export const ORCHESTRATION_LANE_REGISTRY_EXTRA = {
  research: { priorityOrder: 45, copyKey: 'research', iconKey: 'research' },
} as const;

export const ORCHESTRATION_LANE_REGISTRY: Record<OrchestrationLaneId, LaneRegistryEntry> = BASE;

export function getLaneRegistryEntry(lane: string): LaneRegistryEntry {
  if (Object.prototype.hasOwnProperty.call(BASE, lane)) {
    return BASE[lane as OrchestrationLaneId];
  }
  return { priorityOrder: 999, copyKey: lane, iconKey: 'unknown' };
}

export function sortLaneIdsByRegistry<T extends string>(lanes: T[]): T[] {
  return [...lanes].sort(
    (a, b) => getLaneRegistryEntry(a).priorityOrder - getLaneRegistryEntry(b).priorityOrder,
  );
}

export { ORCHESTRATION_LANE_IDS };
