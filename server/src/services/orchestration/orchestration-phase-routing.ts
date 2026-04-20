import {
  ORCHESTRATION_CONSTRAINT_KEYS,
  ORCHESTRATION_ROUTING_CONSTRAINT_LANE_BIAS,
  ORCHESTRATION_ROUTING_DOMAIN_WEIGHTS,
  ORCHESTRATION_ROUTING_LANE_BIAS_MULTIPLIER,
  type OrchestrationConstraintKey,
} from '../../config/orchestration-graph-policy.js';
import type { StrategyInitiativeDomainKey } from '../../config/strategy-initiative-policy.js';
import type {
  OrchestrationActionNode,
  OrchestrationPhaseDiagnostic,
  OrchestrationRoutingProfile,
} from '../../types/orchestration/index.js';

const CONSTRAINT_DOMAIN_PRIORITY: Record<
  OrchestrationConstraintKey,
  StrategyInitiativeDomainKey[]
> = {
  compliance_risk: ['security_compliance', 'tech_infrastructure'],
  technical_debt: ['tech_infrastructure', 'automation_processes'],
  go_to_market: ['marketing_utp', 'seo_digital', 'ux_conversion'],
  capacity: ['automation_processes', 'ux_conversion', 'tech_infrastructure'],
};

function constraintWeightForNode(node: OrchestrationActionNode): Record<OrchestrationConstraintKey, number> {
  const laneBias: Record<OrchestrationConstraintKey, number> = ORCHESTRATION_CONSTRAINT_KEYS.reduce(
    (acc, key) => {
      const laneSet = ORCHESTRATION_ROUTING_CONSTRAINT_LANE_BIAS[key];
      acc[key] = laneSet.includes(node.lane) ? ORCHESTRATION_ROUTING_LANE_BIAS_MULTIPLIER : 1;
      return acc;
    },
    {} as Record<OrchestrationConstraintKey, number>,
  );
  const base = Math.max(1, node.impact_score ?? 3);
  return {
    capacity: base * laneBias.capacity,
    technical_debt: base * laneBias.technical_debt,
    compliance_risk: base * laneBias.compliance_risk * Math.max(1, node.risk_score ?? 3) / 3,
    go_to_market: base * laneBias.go_to_market,
  };
}

function computeConstraintScores(nodes: OrchestrationActionNode[]): Record<OrchestrationConstraintKey, number> {
  const acc: Record<OrchestrationConstraintKey, number> = {
    capacity: 0,
    technical_debt: 0,
    compliance_risk: 0,
    go_to_market: 0,
  };
  for (const node of nodes) {
    const weight = constraintWeightForNode(node);
    for (const key of ORCHESTRATION_CONSTRAINT_KEYS) {
      acc[key] += weight[key];
    }
  }
  return acc;
}

function rankConstraints(scores: Record<OrchestrationConstraintKey, number>): OrchestrationConstraintKey[] {
  return [...ORCHESTRATION_CONSTRAINT_KEYS].sort((a, b) => {
    if (scores[b] === scores[a]) return a.localeCompare(b);
    return scores[b] - scores[a];
  });
}

export function buildOrchestrationPhaseRouting(nodes: OrchestrationActionNode[]): {
  phase_diagnostic: OrchestrationPhaseDiagnostic;
  routing_profile: OrchestrationRoutingProfile;
  domain_influence: { domain_weights: Partial<Record<StrategyInitiativeDomainKey, number>> };
} {
  const scores = computeConstraintScores(nodes);
  const chain = rankConstraints(scores);
  const dominant = chain[0] ?? 'capacity';
  const domain_weights: Partial<Record<StrategyInitiativeDomainKey, number>> = {};

  const primaryDomains = new Set(CONSTRAINT_DOMAIN_PRIORITY[dominant].slice(0, 1));
  const secondaryDomains = new Set(CONSTRAINT_DOMAIN_PRIORITY[dominant].slice(1));

  const touchedDomains = new Set(nodes.map(node => node.domain));
  for (const domain of touchedDomains) {
    if (primaryDomains.has(domain)) {
      domain_weights[domain] = ORCHESTRATION_ROUTING_DOMAIN_WEIGHTS.primary;
    } else if (secondaryDomains.has(domain)) {
      domain_weights[domain] = ORCHESTRATION_ROUTING_DOMAIN_WEIGHTS.secondary;
    } else {
      domain_weights[domain] = ORCHESTRATION_ROUTING_DOMAIN_WEIGHTS.default;
    }
  }

  return {
    phase_diagnostic: {
      dominant_constraint: dominant,
      constraint_chain: chain,
    },
    routing_profile: {
      strategy: 'toc_dynamic_routing_v1',
      domain_weights,
    },
    domain_influence: {
      domain_weights: { ...domain_weights },
    },
  };
}
