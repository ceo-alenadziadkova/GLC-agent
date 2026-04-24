/**
 * Declarative cross-domain tension rules for orchestration merge and client messaging.
 * Graph repair remains deterministic in `orchestration-graph-builder`; this module is the SSOT
 * for *which* domain pairs represent known product conflicts (growth vs reliability, etc.).
 */
import type { StrategyInitiativeDomainKey } from './strategy-initiative-policy.js';

export type OrchestrationDomainConflictRuleId =
  | 'growth_vs_tech'
  | 'ux_vs_compliance'
  | 'marketing_vs_security'
  | 'speed_vs_automation';

export interface OrchestrationDomainConflictRule {
  readonly id: OrchestrationDomainConflictRuleId;
  /** Unordered pair — comparison uses sorted domain keys. */
  readonly domains: readonly [StrategyInitiativeDomainKey, StrategyInitiativeDomainKey];
  /** Stable key for copy/telemetry (not shown to end users directly). */
  readonly narrative_key: OrchestrationDomainConflictRuleId;
}

export const ORCHESTRATION_DOMAIN_CONFLICT_RULES: readonly OrchestrationDomainConflictRule[] = [
  {
    id: 'growth_vs_tech',
    domains: ['marketing_utp', 'tech_infrastructure'],
    narrative_key: 'growth_vs_tech',
  },
  {
    id: 'ux_vs_compliance',
    domains: ['ux_conversion', 'security_compliance'],
    narrative_key: 'ux_vs_compliance',
  },
  {
    id: 'marketing_vs_security',
    domains: ['marketing_utp', 'security_compliance'],
    narrative_key: 'marketing_vs_security',
  },
  {
    id: 'speed_vs_automation',
    domains: ['tech_infrastructure', 'automation_processes'],
    narrative_key: 'speed_vs_automation',
  },
] as const;

function pairKey(a: StrategyInitiativeDomainKey, b: StrategyInitiativeDomainKey): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

const RULE_BY_PAIR = new Map<string, OrchestrationDomainConflictRule>();
for (const rule of ORCHESTRATION_DOMAIN_CONFLICT_RULES) {
  const [d0, d1] = rule.domains;
  RULE_BY_PAIR.set(pairKey(d0, d1), rule);
}

/**
 * Returns the canonical conflict rule when the two domains appear together in scope, else null.
 */
export function resolveOrchestrationDomainConflictRule(
  a: StrategyInitiativeDomainKey,
  b: StrategyInitiativeDomainKey,
): OrchestrationDomainConflictRule | null {
  if (a === b) return null;
  return RULE_BY_PAIR.get(pairKey(a, b)) ?? null;
}
