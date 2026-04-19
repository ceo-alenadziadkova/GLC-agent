/**
 * Orchestrator timeline lanes (ADR-CLIENT-UNIFIED-ROADMAP-V1-MULTI-LANE-TIMELINE).
 * Single source for lane ids — Zod enums derive from these tuples.
 */

import type { StrategyInitiativeDomainKey } from './strategy-initiative-policy.js';

export const ORCHESTRATION_LANE_IDS = [
  'product_change',
  'tech_delivery',
  'marketing_narrative',
  'seo',
  'processes_automation',
  'risk_compliance',
] as const;

export type OrchestrationLaneId = (typeof ORCHESTRATION_LANE_IDS)[number];

/**
 * Maps strategy initiative domain labels to a primary orchestration lane.
 */
export function mapStrategyInitiativeDomainToLane(domain: StrategyInitiativeDomainKey): OrchestrationLaneId {
  switch (domain) {
    case 'tech_infrastructure':
      return 'tech_delivery';
    case 'security_compliance':
      return 'risk_compliance';
    case 'seo_digital':
      return 'seo';
    case 'marketing_utp':
      return 'marketing_narrative';
    case 'ux_conversion':
      return 'product_change';
    case 'automation_processes':
      return 'processes_automation';
    case 'cross_domain':
    case 'operations':
    case 'finance':
    case 'sales':
    case 'customer_success':
      return 'product_change';
  }
}
