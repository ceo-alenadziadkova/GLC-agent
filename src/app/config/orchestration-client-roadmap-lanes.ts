/**
 * Lane visibility for orchestration timeline surfaces (MVP vs full).
 * Extend by editing ordered lists — avoid scattering lane keys in UI.
 */

import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import type { OrchestrationLaneId } from './orchestration-roadmap-ui-copy.en';
import type { DomainKey } from '@glc/intake-core';

export type OrchestrationLaneDisplayPreset = 'full' | 'client_mvp';

const ORCHESTRATION_LANE_DISPLAY_ORDER_FULL = [
  'product_change',
  'tech_delivery',
  'marketing_narrative',
  'seo',
  'processes_automation',
  'risk_compliance',
] as const satisfies readonly OrchestrationLaneId[];

/** MVP: 2–3 parallel tracks for client portal timeline density. */
const CLIENT_ORCHESTRATION_TIMELINE_LANE_ORDER = [
  'product_change',
  'tech_delivery',
  'marketing_narrative',
] as const satisfies readonly OrchestrationLaneId[];

export function laneIdsForOrchestrationDisplayPreset(preset: OrchestrationLaneDisplayPreset): OrchestrationLaneId[] {
  return preset === 'full' ? [...ORCHESTRATION_LANE_DISPLAY_ORDER_FULL] : [...CLIENT_ORCHESTRATION_TIMELINE_LANE_ORDER];
}

/**
 * Ordered lane keys that have at least one node id in this pack (subset of `laneOrder`).
 */
export function visibleOrchestrationLanesForPack(
  packLanes: GlcOrchestrationPackView['lanes'],
  laneOrder: readonly OrchestrationLaneId[],
  selectedDomains?: readonly DomainKey[] | null,
): OrchestrationLaneId[] {
  const allowedByCoverage = selectedDomains ? laneIdsForSelectedDomains(selectedDomains) : null;
  const out: OrchestrationLaneId[] = [];
  for (const laneId of laneOrder) {
    if (allowedByCoverage && !allowedByCoverage.has(laneId)) continue;
    const ids = packLanes[laneId];
    if (Array.isArray(ids) && ids.length > 0) {
      out.push(laneId);
    }
  }
  return out;
}

function laneIdsForSelectedDomains(selectedDomains: readonly DomainKey[]): Set<OrchestrationLaneId> {
  const out = new Set<OrchestrationLaneId>();
  for (const domain of selectedDomains) {
    switch (domain) {
      case 'tech_infrastructure':
        out.add('tech_delivery');
        break;
      case 'security_compliance':
        out.add('risk_compliance');
        break;
      case 'seo_digital':
        out.add('seo');
        break;
      case 'marketing_utp':
        out.add('marketing_narrative');
        break;
      case 'ux_conversion':
        out.add('product_change');
        break;
      case 'automation_processes':
        out.add('processes_automation');
        break;
    }
  }
  return out;
}
