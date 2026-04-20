import { describe, expect, it } from 'vitest';

import type { GlcOrchestrationPack } from '../schemas/glc-orchestration-pack.js';
import {
  isTightenedQualityRolloutReady,
  resolveOrchestrationPlanGovernanceRolloutTransition,
} from '../config/orchestration-plan-governance-rollout-policy.js';
import { evaluateOrchestrationPlanGovernance } from '../services/orchestration/orchestration-plan-governance.service.js';

function pack(partial: Partial<GlcOrchestrationPack>): GlcOrchestrationPack {
  return {
    version: 2,
    graph: {
      nodes: [{ id: 'a', title: 'A', lane: 'tech_delivery', domain: 'tech_infrastructure' }],
      edges: [],
    },
    lanes: {
      product_change: [],
      tech_delivery: ['a'],
      marketing_narrative: [],
      seo: [],
      processes_automation: [],
      risk_compliance: [],
    },
    critical_path: ['a'],
    conflicts_resolved: [],
    manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
    phase_diagnostic: {
      dominant_constraint: 'capacity',
      constraint_chain: ['capacity'],
    },
    routing_profile: {
      strategy: 'toc_dynamic_routing_v1',
      domain_weights: { tech_infrastructure: 1 },
    },
    execution_mode: 'deterministic',
    confidence_map: { node_confidence: { a: 'medium' } },
    risk_layer: { node_risk: { a: 3 } },
    domain_influence: { domain_weights: { tech_infrastructure: 1 } },
    input_quality: {
      input_mode: 'director_enriched',
      director_coverage_ratio: 1,
      director_input_coverage_ratio: 1,
      degraded: false,
    },
    ...partial,
  } as GlcOrchestrationPack;
}

describe('evaluateOrchestrationPlanGovernance', () => {
  it('returns accept_plan for healthy plan', () => {
    const result = evaluateOrchestrationPlanGovernance(pack({}));
    expect(result.decision_hint).toBe('accept_plan');
    expect(result.warnings).toEqual([]);
    expect(result.reason_codes).toEqual([]);
  });

  it('returns refine_plan when cycles are detected', () => {
    const result = evaluateOrchestrationPlanGovernance(
      pack({
        graph: {
          nodes: [
            { id: 'a', title: 'A', lane: 'tech_delivery', domain: 'tech_infrastructure' },
            { id: 'b', title: 'B', lane: 'tech_delivery', domain: 'tech_infrastructure' },
          ],
          edges: [
            { from: 'a', to: 'b', relation: 'direct_blocker', weight: 1 },
            { from: 'b', to: 'a', relation: 'direct_blocker', weight: 1 },
          ],
        },
        lanes: {
          product_change: [],
          tech_delivery: ['a', 'b'],
          marketing_narrative: [],
          seo: [],
          processes_automation: [],
          risk_compliance: [],
        },
        critical_path: ['a', 'b'],
      }),
    );
    expect(result.decision_hint).toBe('refine_plan');
    expect(result.cycles_detected).toBeGreaterThan(0);
    expect(result.reason_codes).toContain('dependency_cycles_detected');
    expect(result.status).toBe('fail');
    expect(result.decision).toBe('reject');
  });

  it('returns accept_with_warnings for non-blocking governance gaps', () => {
    const result = evaluateOrchestrationPlanGovernance(
      pack({
        confidence_map: { node_confidence: {} },
        risk_layer: { node_risk: {} },
      }),
    );
    expect(result.decision_hint).toBe('accept_with_warnings');
    expect(result.reason_codes).toContain('confidence_coverage_below_floor');
    expect(result.reason_codes).toContain('risk_coverage_below_floor');
    expect(result.status).toBe('pass_with_warnings');
    expect(result.decision).toBe('persist');
  });

  it('keeps structural failures as warnings in shadow rollout', () => {
    const result = evaluateOrchestrationPlanGovernance(
      pack({
        graph: {
          nodes: [{ id: 'a', title: 'A', lane: 'tech_delivery', domain: 'tech_infrastructure' }],
          edges: [{ from: 'a', to: 'a', relation: 'direct_blocker', weight: 1 }],
        },
      }),
      { rolloutMode: 'shadow' },
    );
    expect(result.decision).toBe('persist');
    expect(result.status).toBe('pass_with_warnings');
    expect(result.blocking_reasons).toEqual([]);
    expect(result.warnings_soft).toContain('dependency_cycles_detected');
  });

  it('promotes selected quality checks to blockers in tightened rollout', () => {
    const result = evaluateOrchestrationPlanGovernance(
      pack({
        confidence_map: { node_confidence: {} },
      }),
      { rolloutMode: 'tightened_quality' },
    );
    expect(result.decision).toBe('reject');
    expect(result.status).toBe('fail');
    expect(result.blocking_reasons).toContain('confidence_coverage_below_floor');
  });

  it('computes tightened-quality rollout readiness from telemetry floors', () => {
    expect(
      isTightenedQualityRolloutReady({
        dependencyIntegrityScore: 0.9,
        confidenceCoverageScore: 0.75,
        riskCoverageScore: 0.6,
      }),
    ).toBe(true);
    expect(
      isTightenedQualityRolloutReady({
        dependencyIntegrityScore: 0.89,
        confidenceCoverageScore: 0.75,
        riskCoverageScore: 0.6,
      }),
    ).toBe(false);
  });

  it('suggests rollout promotion path only when readiness floors are met', () => {
    const readiness = {
      dependencyIntegrityScore: 0.92,
      confidenceCoverageScore: 0.8,
      riskCoverageScore: 0.7,
    };
    expect(
      resolveOrchestrationPlanGovernanceRolloutTransition({
        currentMode: 'shadow',
        readiness,
      }),
    ).toMatchObject({
      currentMode: 'shadow',
      recommendedMode: 'hard_structure_soft_quality',
      readyForPromotion: true,
    });
    expect(
      resolveOrchestrationPlanGovernanceRolloutTransition({
        currentMode: 'hard_structure_soft_quality',
        readiness,
      }),
    ).toMatchObject({
      currentMode: 'hard_structure_soft_quality',
      recommendedMode: 'tightened_quality',
      readyForPromotion: true,
    });
    expect(
      resolveOrchestrationPlanGovernanceRolloutTransition({
        currentMode: 'hard_structure_soft_quality',
        readiness: {
          dependencyIntegrityScore: 0.5,
          confidenceCoverageScore: 0.5,
          riskCoverageScore: 0.5,
        },
      }),
    ).toMatchObject({
      currentMode: 'hard_structure_soft_quality',
      recommendedMode: 'hard_structure_soft_quality',
      readyForPromotion: false,
    });
  });
});
