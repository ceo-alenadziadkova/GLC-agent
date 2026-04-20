import { describe, expect, it } from 'vitest';

import { GLC_ORCHESTRATION_PACK_SCHEMA_VERSION } from '../config/orchestration-graph-policy.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';
import type { GlcOrchestrationPack } from '../schemas/glc-orchestration-pack.js';
import {
  buildOrchestrationPackRevisionDiff,
  summarizeOrchestrationPackRevisionDiff,
} from '../services/orchestration/orchestration-pack-diff.js';

const SNAPSHOT_ID = '11111111-1111-4111-8111-111111111111';

function basePack(): GlcOrchestrationPack {
  return {
    version: GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
    graph: {
      nodes: [
        {
          id: 'a',
          title: 'A',
          domain: 'marketing_utp',
          lane: 'marketing_narrative',
        },
      ],
      edges: [],
    },
    lanes: Object.fromEntries(ORCHESTRATION_LANE_IDS.map(l => [l, l === 'marketing_narrative' ? ['a'] : []])) as GlcOrchestrationPack['lanes'],
    critical_path: ['a'],
    conflicts_resolved: [],
    manifest_snapshot_id: SNAPSHOT_ID,
    phase_diagnostic: {
      dominant_constraint: 'capacity',
      constraint_chain: ['capacity'],
    },
    routing_profile: {
      strategy: 'toc_dynamic_routing_v1',
      domain_weights: { marketing_utp: 1 },
    },
    execution_mode: 'deterministic',
    confidence_map: { node_confidence: {} },
    risk_layer: { node_risk: {} },
    domain_influence: { domain_weights: { marketing_utp: 1 } },
    input_quality: {
      input_mode: 'director_enriched',
      director_coverage_ratio: 1,
      director_input_coverage_ratio: 1,
      degraded: false,
    },
  };
}

describe('buildOrchestrationPackRevisionDiff', () => {
  it('treats first pack as all added when previous is null', () => {
    const next = basePack();
    const diff = buildOrchestrationPackRevisionDiff({
      previous: null,
      next,
      fromVersion: 0,
      toVersion: 1,
    });
    expect(diff.nodes_added).toEqual(['a']);
    expect(diff.nodes_removed).toEqual([]);
    expect(diff.critical_path_changed).toBe(true);
  });

  it('detects added nodes and critical path change', () => {
    const prev = basePack();
    const next: GlcOrchestrationPack = {
      ...prev,
      graph: {
        ...prev.graph,
        nodes: [
          ...prev.graph.nodes,
          {
            id: 'b',
            title: 'B',
            domain: 'ux_conversion',
            lane: 'product_change',
          },
        ],
      },
      lanes: Object.fromEntries(
        ORCHESTRATION_LANE_IDS.map(l => [
          l,
          l === 'marketing_narrative' ? ['a'] : l === 'product_change' ? ['b'] : [],
        ]),
      ) as GlcOrchestrationPack['lanes'],
      critical_path: ['a', 'b'],
    };
    const diff = buildOrchestrationPackRevisionDiff({
      previous: prev,
      next,
      fromVersion: 1,
      toVersion: 2,
    });
    expect(diff.nodes_added).toEqual(['b']);
    expect(diff.critical_path_changed).toBe(true);
    expect(diff.from_version).toBe(1);
    expect(diff.to_version).toBe(2);
  });

  it('captures removed nodes and removed edges', () => {
    const prev: GlcOrchestrationPack = {
      ...basePack(),
      graph: {
        nodes: [
          ...basePack().graph.nodes,
          {
            id: 'b',
            title: 'B',
            domain: 'ux_conversion',
            lane: 'product_change',
          },
        ],
        edges: [{ from: 'a', to: 'b', relation: 'direct_blocker', weight: 1 }],
      },
      lanes: Object.fromEntries(
        ORCHESTRATION_LANE_IDS.map(l => [
          l,
          l === 'marketing_narrative' ? ['a'] : l === 'product_change' ? ['b'] : [],
        ]),
      ) as GlcOrchestrationPack['lanes'],
      critical_path: ['a', 'b'],
    };
    const next = basePack();
    const diff = buildOrchestrationPackRevisionDiff({
      previous: prev,
      next,
      fromVersion: 4,
      toVersion: 5,
    });
    expect(diff.nodes_removed).toContain('b');
    expect(diff.edges_removed).toEqual([{ from: 'a', to: 'b' }]);
  });

  it('keeps no-op diff empty when packs are equivalent', () => {
    const prev = basePack();
    const next = basePack();
    const diff = buildOrchestrationPackRevisionDiff({
      previous: prev,
      next,
      fromVersion: 7,
      toVersion: 8,
    });
    expect(diff.nodes_added).toEqual([]);
    expect(diff.nodes_removed).toEqual([]);
    expect(diff.edges_added).toEqual([]);
    expect(diff.edges_removed).toEqual([]);
    expect(diff.critical_path_changed).toBe(false);
  });

  it('builds readable summary for structural changes', () => {
    const prev = basePack();
    const next: GlcOrchestrationPack = {
      ...prev,
      graph: {
        ...prev.graph,
        nodes: [
          ...prev.graph.nodes,
          {
            id: 'b',
            title: 'B',
            domain: 'ux_conversion',
            lane: 'product_change',
          },
        ],
      },
      critical_path: ['a', 'b'],
    };
    const diff = buildOrchestrationPackRevisionDiff({
      previous: prev,
      next,
      fromVersion: 2,
      toVersion: 3,
    });
    expect(summarizeOrchestrationPackRevisionDiff(diff)).toContain('v2 -> v3');
    expect(summarizeOrchestrationPackRevisionDiff(diff)).toContain('+1 initiatives');
  });

  it('includes non-structural governance-relevant changes in summary', () => {
    const prev = basePack();
    const next: GlcOrchestrationPack = {
      ...prev,
      execution_mode: 'hybrid',
      confidence_map: { node_confidence: { a: 'high' } },
      risk_layer: { node_risk: { a: 2 } },
      domain_influence: { domain_weights: { marketing_utp: 1.2 } },
      conflicts_resolved: [{ id: 'c1', summary: 'resolved', resolution: 'synthesis_applied' }],
    };
    const diff = buildOrchestrationPackRevisionDiff({
      previous: prev,
      next,
      fromVersion: 3,
      toVersion: 4,
    });
    const summary = summarizeOrchestrationPackRevisionDiff(diff);
    expect(summary).toContain('execution mode updated');
    expect(summary).toContain('confidence model updated');
    expect(summary).toContain('risk layer updated');
    expect(summary).toContain('domain influence updated');
    expect(summary).toContain('conflicts 0 -> 1');
  });
});
