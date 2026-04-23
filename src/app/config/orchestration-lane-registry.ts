import type { OrchestrationLaneId } from './orchestration-roadmap-ui-copy.en';

/**
 * **Lane display & sort SSOT (client).** Add new `BASE` entries here; keep
 * [server `orchestration-lane-registry`](../../../server/src/config/orchestration-lane-registry.ts) aligned for priority.
 * For **cross-lane copy** (narrative lines), `orchestration-lane-pair-narratives` is a separate layer — new lanes need
 * labels in copy + optional pair keys there; do not re-sort by scattering raw lane id literals in pages.
 */
export type ClientLaneRegistryEntry = {
  priorityOrder: number;
  copyKey: string;
  iconKey: string;
};

const BASE: Record<OrchestrationLaneId, ClientLaneRegistryEntry> = {
  product_change: { priorityOrder: 10, copyKey: 'product_change', iconKey: 'product' },
  tech_delivery: { priorityOrder: 20, copyKey: 'tech_delivery', iconKey: 'tech' },
  marketing_narrative: { priorityOrder: 30, copyKey: 'marketing_narrative', iconKey: 'marketing' },
  gtm_sales: { priorityOrder: 35, copyKey: 'gtm_sales', iconKey: 'sales' },
  seo: { priorityOrder: 40, copyKey: 'seo', iconKey: 'seo' },
  research: { priorityOrder: 45, copyKey: 'research', iconKey: 'research' },
  processes_automation: { priorityOrder: 50, copyKey: 'processes_automation', iconKey: 'process' },
  risk_compliance: { priorityOrder: 60, copyKey: 'risk_compliance', iconKey: 'risk' },
};

export function getClientLaneRegistryEntry(lane: string): ClientLaneRegistryEntry {
  if (Object.prototype.hasOwnProperty.call(BASE, lane)) {
    return BASE[lane as OrchestrationLaneId];
  }
  return { priorityOrder: 999, copyKey: lane, iconKey: 'unknown' };
}

export function sortLaneIdsByClientRegistry<T extends string>(lanes: T[]): T[] {
  return [...lanes].sort(
    (a, b) => getClientLaneRegistryEntry(a).priorityOrder - getClientLaneRegistryEntry(b).priorityOrder,
  );
}
