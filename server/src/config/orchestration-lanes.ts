/**
 * Orchestrator timeline lanes (ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE).
 * Single source for lane ids — Zod enums derive from these tuples.
 */

import type { StrategyInitiativeDomainKey } from './strategy-initiative-policy.js';
import type { DomainKey } from '@glc/intake-core';

export const ORCHESTRATION_LANE_IDS = [
  'product_change',
  'tech_delivery',
  'marketing_narrative',
  'seo',
  'processes_automation',
  'risk_compliance',
] as const;

export type OrchestrationLaneId = (typeof ORCHESTRATION_LANE_IDS)[number];

const ORCHESTRATION_DOMAIN_LANE_MAP: Record<DomainKey, OrchestrationLaneId> = {
  tech_infrastructure: 'tech_delivery',
  security_compliance: 'risk_compliance',
  seo_digital: 'seo',
  marketing_utp: 'marketing_narrative',
  ux_conversion: 'product_change',
  automation_processes: 'processes_automation',
};

/**
 * Maps strategy initiative domain labels to a primary orchestration lane.
 */
export function mapStrategyInitiativeDomainToLane(domain: StrategyInitiativeDomainKey): OrchestrationLaneId {
  switch (domain) {
    case 'tech_infrastructure':
      return ORCHESTRATION_DOMAIN_LANE_MAP.tech_infrastructure;
    case 'security_compliance':
      return ORCHESTRATION_DOMAIN_LANE_MAP.security_compliance;
    case 'seo_digital':
      return ORCHESTRATION_DOMAIN_LANE_MAP.seo_digital;
    case 'marketing_utp':
      return ORCHESTRATION_DOMAIN_LANE_MAP.marketing_utp;
    case 'ux_conversion':
      return ORCHESTRATION_DOMAIN_LANE_MAP.ux_conversion;
    case 'automation_processes':
      return ORCHESTRATION_DOMAIN_LANE_MAP.automation_processes;
    case 'cross_domain':
    case 'operations':
    case 'finance':
    case 'sales':
    case 'customer_success':
      return 'product_change';
  }
}

/**
 * Director domain-to-lane mapping stays isolated from strategy mapping.
 * This keeps director contracts extensible without touching strategy-specific labels.
 */
export function mapDirectorDomainToLane(domain: DomainKey): OrchestrationLaneId {
  return ORCHESTRATION_DOMAIN_LANE_MAP[domain];
}
