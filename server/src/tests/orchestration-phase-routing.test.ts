import { describe, expect, it } from 'vitest';

import { buildOrchestrationPhaseRouting } from '../services/orchestration/orchestration-phase-routing.js';

describe('buildOrchestrationPhaseRouting', () => {
  it('computes deterministic dominant constraint and ADR range domain weights', () => {
    const result = buildOrchestrationPhaseRouting([
      {
        id: 'r1',
        title: 'Risk First',
        domain: 'security_compliance',
        lane: 'risk_compliance',
        dependencies: [],
        weight: 1,
        impact_score: 5,
        risk_score: 5,
      },
      {
        id: 't1',
        title: 'Tech Follow',
        domain: 'tech_infrastructure',
        lane: 'tech_delivery',
        dependencies: [],
        weight: 1,
        impact_score: 3,
        risk_score: 3,
      },
    ]);

    expect(result.phase_diagnostic.dominant_constraint).toBe('compliance_risk');
    expect(result.phase_diagnostic.constraint_chain[0]).toBe('compliance_risk');
    expect(result.routing_profile.domain_weights.security_compliance).toBe(2);
    expect(result.routing_profile.domain_weights.tech_infrastructure).toBe(1.5);
  });
});
