import { describe, expect, it } from 'vitest';

import { buildOrchestrationSetAggregator } from '../orchestration-set-aggregator';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';

const base = (): GlcOrchestrationPackView =>
  ({
    version: 2,
    graph: {
      nodes: [
        {
          id: 'n1',
          title: 'A',
          domain: 'ux_conversion',
          lane: 'product_change',
          priority_score: 0.8,
          target_window_days: 14,
        },
        {
          id: 'n2',
          title: 'B',
          domain: 'tech_infrastructure',
          lane: 'tech_delivery',
          priority_score: 0.4,
          target_window_days: 7,
        },
      ],
      edges: [],
    },
    lanes: { product_change: ['n1'], tech_delivery: ['n2'] } as GlcOrchestrationPackView['lanes'],
    critical_path: ['n1'],
    conflicts_resolved: [],
    manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
    phase_diagnostic: {
      dominant_constraint: 'capacity',
      constraint_chain: ['capacity'],
    },
    routing_profile: { strategy: 'toc_dynamic_routing_v1', domain_weights: {} },
    confidence_map: {
      node_confidence: { n1: 'high', n2: 'low' },
    },
    risk_layer: { node_risk: { n1: 2, n2: 4 } },
  }) as GlcOrchestrationPackView;

describe('buildOrchestrationSetAggregator', () => {
  it('aggregates selected nodes (starter: two actions)', () => {
    const pack = base();
    const out = buildOrchestrationSetAggregator(['n1', 'n2'], pack);
    expect(out.effortRange).toEqual({ minDays: 7, maxDays: 14 });
    expect(out.minConfidence).toBe('low');
    expect(out.confidenceDistribution).toEqual({ high: 1, medium: 0, low: 1 });
  });

  it('empty selection returns empty aggregate', () => {
    const out = buildOrchestrationSetAggregator([], base());
    expect(out.minConfidence).toBe('unknown');
    expect(out.effortRange).toBeNull();
  });
});
