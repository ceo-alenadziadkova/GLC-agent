import { describe, expect, it } from 'vitest';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_PACK_SCHEMA_VERSION } from '../../config/orchestration-contract';
import {
  buildOrchestrationPackFlowGraph,
  capPackFlowEdgesForNodeBudget,
} from '../build-orchestration-pack-flow-graph';

function minimalPack(overrides: Partial<GlcOrchestrationPackView> = {}): GlcOrchestrationPackView {
  const base: GlcOrchestrationPackView = {
    version: ORCHESTRATION_PACK_SCHEMA_VERSION,
    graph: {
      nodes: [
        { id: 'a', title: 'Alpha', domain: 'seo_digital', lane: 'seo' },
        { id: 'b', title: 'Beta', domain: 'tech_infrastructure', lane: 'tech_delivery' },
      ],
      edges: [{ from: 'a', to: 'b', relation: 'strong' }],
    },
    lanes: {
      seo: ['a'],
      tech_delivery: ['b'],
      product_change: [],
      marketing_narrative: [],
      processes_automation: [],
      risk_compliance: [],
    },
    critical_path: ['a', 'b'],
    conflicts_resolved: [],
    manifest_snapshot_id: 'snap-1',
    ...overrides,
  };
  return base;
}

describe('capPackFlowEdgesForNodeBudget', () => {
  it('keeps critical path nodes even when trimming', () => {
    const pack = minimalPack({
      graph: {
        nodes: [
          { id: 'a', title: 'A', domain: 'seo_digital', lane: 'seo' },
          { id: 'b', title: 'B', domain: 'tech_infrastructure', lane: 'tech_delivery' },
          { id: 'c', title: 'C', domain: 'ux_conversion', lane: 'product_change' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
        ],
      },
      critical_path: ['a', 'b'],
    });
    const prioritized = pack.graph.edges;
    const { edges, nodesDroppedFromBudget } = capPackFlowEdgesForNodeBudget({
      pack,
      prioritizedEdges: prioritized,
      maxNodes: 2,
    });
    expect(edges).toEqual([{ from: 'a', to: 'b' }]);
    expect(nodesDroppedFromBudget).toBeGreaterThan(0);
  });
});

describe('buildOrchestrationPackFlowGraph', () => {
  it('returns positioned nodes and smoothstep edges', () => {
    const { nodes, edges } = buildOrchestrationPackFlowGraph(minimalPack(), {
      maxFlowEdges: 10,
      maxFlowNodes: 10,
    });
    expect(nodes).toHaveLength(2);
    expect(nodes[0].position).toBeDefined();
    expect(edges).toHaveLength(1);
    expect(edges[0].source).toBe('a');
    expect(edges[0].target).toBe('b');
    expect(edges[0].className).toContain('critical');
  });

  it('returns empty arrays when graph has no nodes in projection', () => {
    const pack = minimalPack({
      critical_path: [],
      graph: { nodes: [], edges: [] },
      lanes: {
        seo: [],
        tech_delivery: [],
        product_change: [],
        marketing_narrative: [],
        processes_automation: [],
        risk_compliance: [],
      },
    });
    const { nodes, edges } = buildOrchestrationPackFlowGraph(pack, { maxFlowEdges: 10, maxFlowNodes: 10 });
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('includes more edges in expanded budgets when the pack is larger', () => {
    const nodes = Array.from({ length: 12 }, (_, i) => ({
      id: `n${i}`,
      title: `N${i}`,
      domain: 'seo_digital' as const,
      lane: 'seo' as const,
    }));
    const edges = Array.from({ length: 11 }, (_, i) => ({
      from: `n${i}`,
      to: `n${i + 1}`,
    }));
    const pack = minimalPack({
      graph: { nodes, edges },
      critical_path: nodes.map(n => n.id),
      lanes: {
        seo: nodes.map(n => n.id),
        tech_delivery: [],
        product_change: [],
        marketing_narrative: [],
        processes_automation: [],
        risk_compliance: [],
      },
    });
    const compact = buildOrchestrationPackFlowGraph(pack, { maxFlowEdges: 5, maxFlowNodes: 8 });
    const expanded = buildOrchestrationPackFlowGraph(pack, { maxFlowEdges: 64, maxFlowNodes: 56 });
    expect(expanded.edges.length).toBeGreaterThan(compact.edges.length);
    expect(expanded.nodes.length).toBeGreaterThanOrEqual(compact.nodes.length);
  });

  it('marks non–critical-path edges without critical class', () => {
    const pack = minimalPack({
      graph: {
        nodes: [
          { id: 'a', title: 'A', domain: 'seo_digital', lane: 'seo' },
          { id: 'b', title: 'B', domain: 'tech_infrastructure', lane: 'tech_delivery' },
          { id: 'c', title: 'C', domain: 'ux_conversion', lane: 'product_change' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'c', to: 'b' },
        ],
      },
      critical_path: ['a', 'b'],
    });
    const { edges } = buildOrchestrationPackFlowGraph(pack, { maxFlowEdges: 10, maxFlowNodes: 10 });
    const cross = edges.find(e => e.source === 'c');
    expect(cross?.className).toContain('default');
  });
});
