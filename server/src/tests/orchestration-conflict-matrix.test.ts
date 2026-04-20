import { describe, expect, it } from 'vitest';

import { evaluateOrchestrationPlanGovernance } from '../services/orchestration/orchestration-plan-governance.service.js';

function basePack() {
  return {
    graph: {
      nodes: [{ id: 'n1', lane: 'tech_delivery' }],
      edges: [],
    },
    critical_path: ['n1'],
    confidence_map: { node_confidence: { n1: 'high' } },
    risk_layer: { node_risk: { n1: 2 } },
    conflicts_resolved: [],
  };
}

describe('orchestration conflict matrix', () => {
  it('flags dependency cycle as refine_plan', () => {
    const pack = {
      ...basePack(),
      graph: {
        nodes: [{ id: 'n1', lane: 'tech_delivery' }],
        edges: [{ from: 'n1', to: 'n1' }],
      },
    };
    const result = evaluateOrchestrationPlanGovernance(pack as never);
    expect(result.reason_codes).toContain('dependency_cycles_detected');
    expect(result.decision_hint).toBe('refine_plan');
  });

  it('flags orphan edge via dependency integrity', () => {
    const pack = {
      ...basePack(),
      graph: {
        nodes: [{ id: 'n1', lane: 'tech_delivery' }],
        edges: [{ from: 'missing', to: 'n1' }],
      },
    };
    const result = evaluateOrchestrationPlanGovernance(pack as never);
    expect(result.reason_codes).toContain('dependency_integrity_below_floor');
  });

  it('flags invalid lane assignments', () => {
    const pack = {
      ...basePack(),
      graph: {
        nodes: [{ id: 'n1', lane: 'not_a_lane' }],
        edges: [],
      },
    };
    const result = evaluateOrchestrationPlanGovernance(pack as never);
    expect(result.reason_codes).toContain('invalid_lane_assignments_detected');
    expect(result.decision_hint).toBe('refine_plan');
  });
});
