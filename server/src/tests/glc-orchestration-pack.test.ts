import { describe, expect, it } from 'vitest';

import { GlcOrchestrationPackSchema, type GlcOrchestrationPack } from '../schemas/glc-orchestration-pack.js';
import { StrategyInitiativeSchema, type StrategyInitiative } from '../schemas/domain-output.js';
import type { AuditExecutionPlan } from '../types/audit.js';
import { buildOrchestrationGraph } from '../services/orchestration/orchestration-graph-builder.js';
import type { OrchestrationActionNode } from '../types/orchestration/index.js';
import {
  assertManifestMatchesExecutionPlan,
  manifestSelectedDomainsMatchExecutionPlan,
} from '../services/orchestration/roadmap-manifest.service.js';
import { parseRoadmapManifestPayload } from '../services/orchestration/roadmap-manifest.service.js';
import {
  mapStrategyInitiativeToActionNode,
  mapStrategyInitiativesToActionNodes,
} from '../services/orchestration/map-strategy-initiative-to-action-node.js';
import { buildGlcOrchestrationPackFromInitiatives } from '../services/orchestration/build-glc-orchestration-pack.js';
import { dedupeOrchestrationActionNodesByPolicy } from '../services/orchestration/dedupe-orchestration-action-nodes.js';
import {
  GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
  ORCHESTRATION_GRAPH_MAX_CRITICAL_PATH_DEPTH,
  ORCHESTRATION_GRAPH_MAX_NODES,
  orchestrationNodeWeight,
} from '../config/orchestration-graph-policy.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';

function node(partial: Partial<OrchestrationActionNode> & Pick<OrchestrationActionNode, 'id'>): OrchestrationActionNode {
  return {
    title: partial.title ?? 'T',
    domain: partial.domain ?? 'marketing_utp',
    lane: partial.lane ?? 'marketing_narrative',
    dependencies: partial.dependencies ?? [],
    weight: partial.weight ?? 1,
    ...partial,
  };
}

describe('GlcOrchestrationPackSchema', () => {
  it('accepts a minimal valid pack', () => {
    const raw = {
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
      lanes: Object.fromEntries(ORCHESTRATION_LANE_IDS.map((l) => [l, l === 'marketing_narrative' ? ['a'] : []])) as Record<
        (typeof ORCHESTRATION_LANE_IDS)[number],
        string[]
      >,
      critical_path: ['a'],
      conflicts_resolved: [],
      manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
      phase_diagnostic: {
        dominant_constraint: 'capacity',
        constraint_chain: ['capacity'],
      },
      routing_profile: {
        strategy: 'toc_dynamic_routing_v1',
        domain_weights: { marketing_utp: 1 },
      },
    };
    const parsed = GlcOrchestrationPackSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  it('rejects wrong schema version', () => {
    const raw = {
      version: 999,
      graph: { nodes: [], edges: [] },
      lanes: Object.fromEntries(ORCHESTRATION_LANE_IDS.map((l) => [l, []])) as GlcOrchestrationPack['lanes'],
      critical_path: [],
      conflicts_resolved: [],
      manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
      phase_diagnostic: {
        dominant_constraint: 'capacity',
        constraint_chain: ['capacity'],
      },
      routing_profile: {
        strategy: 'toc_dynamic_routing_v1',
        domain_weights: {},
      },
    };
    expect(GlcOrchestrationPackSchema.safeParse(raw).success).toBe(false);
  });

  it('adapts v1 payload into v2 contract', () => {
    const rawV1 = {
      version: 1,
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
      lanes: Object.fromEntries(ORCHESTRATION_LANE_IDS.map((l) => [l, l === 'marketing_narrative' ? ['a'] : []])) as Record<
        (typeof ORCHESTRATION_LANE_IDS)[number],
        string[]
      >,
      critical_path: ['a'],
      conflicts_resolved: [],
      manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
    };
    const parsed = GlcOrchestrationPackSchema.parse(rawV1);
    expect(parsed.version).toBe(GLC_ORCHESTRATION_PACK_SCHEMA_VERSION);
    expect(parsed.phase_diagnostic.dominant_constraint).toBe('capacity');
    expect(parsed.routing_profile.strategy).toBe('toc_dynamic_routing_v1');
  });
});

describe('buildOrchestrationGraph', () => {
  it('orders a simple chain into a critical path', () => {
    const r = buildOrchestrationGraph([
      node({ id: 'a', dependencies: [] }),
      node({ id: 'b', dependencies: ['a'] }),
      node({ id: 'c', dependencies: ['b'] }),
    ]);
    expect(r.critical_path[0]).toBe('a');
    expect(r.critical_path[r.critical_path.length - 1]).toBe('c');
    expect(r.graph.edges).toEqual([
      { from: 'a', to: 'b', relation: 'direct_blocker', weight: 1 },
      { from: 'b', to: 'c', relation: 'direct_blocker', weight: 1 },
    ]);
  });

  it('breaks a cycle deterministically and records conflict', () => {
    const r = buildOrchestrationGraph([
      node({ id: 'a', dependencies: ['c'] }),
      node({ id: 'b', dependencies: ['a'] }),
      node({ id: 'c', dependencies: ['b'] }),
    ]);
    expect(r.conflicts_resolved.some((c) => c.id.startsWith('cycle-break:'))).toBe(true);
    expect(r.graph.meta?.cycles_broken).toBeGreaterThan(0);
  });

  it('ignores orphan dependency ids with a deterministic conflict entry', () => {
    const r = buildOrchestrationGraph([node({ id: 'a', dependencies: ['ghost'] })]);
    expect(r.graph.edges).toEqual([]);
    expect(r.conflicts_resolved.some((c) => c.id.startsWith('orphan-dep:'))).toBe(true);
  });

  it('breaks a self-dependency edge and records a cycle conflict', () => {
    const r = buildOrchestrationGraph([node({ id: 'a', dependencies: ['a'] })]);
    expect(r.graph.edges).toEqual([]);
    expect(r.conflicts_resolved.some((c) => c.id.startsWith('cycle-break:'))).toBe(true);
    expect(r.critical_path).toEqual(['a']);
  });

  it('prefers the higher-weight branch when computing critical_path', () => {
    const r = buildOrchestrationGraph([
      node({ id: 'root', dependencies: [], weight: 1 }),
      node({ id: 'low', dependencies: ['root'], weight: 2 }),
      node({ id: 'high', dependencies: ['root'], weight: 80 }),
    ]);
    expect(r.critical_path[r.critical_path.length - 1]).toBe('high');
    expect(r.critical_path).toContain('root');
    expect(r.critical_path).not.toContain('low');
  });

  it('truncates critical_path reconstruction at ORCHESTRATION_GRAPH_MAX_CRITICAL_PATH_DEPTH', () => {
    const n = ORCHESTRATION_GRAPH_MAX_CRITICAL_PATH_DEPTH + 6;
    const nodes: OrchestrationActionNode[] = [];
    for (let i = 0; i < n; i += 1) {
      nodes.push(
        node({
          id: `s${i}`,
          dependencies: i === 0 ? [] : [`s${i - 1}`],
          weight: 1,
        }),
      );
    }
    const r = buildOrchestrationGraph(nodes);
    expect(r.critical_path.length).toBe(ORCHESTRATION_GRAPH_MAX_CRITICAL_PATH_DEPTH);
    expect(r.critical_path[0]).toBe(`s${n - ORCHESTRATION_GRAPH_MAX_CRITICAL_PATH_DEPTH}`);
    expect(r.critical_path[r.critical_path.length - 1]).toBe(`s${n - 1}`);
  });
});

describe('roadmap manifest vs execution_plan', () => {
  it('matches when domain sets are equal', () => {
    const manifest = parseRoadmapManifestPayload({
      selected_domains: ['marketing_utp', 'ux_conversion'],
      change_scenario: 'hybrid',
      season_preset: 'rolling_90d',
    });
    const plan = {
      selected_domains: ['ux_conversion', 'marketing_utp'],
      depth: 'standard' as const,
      source: 'user_selected' as const,
      include_strategy: true,
    } satisfies AuditExecutionPlan;
    expect(manifestSelectedDomainsMatchExecutionPlan(manifest, plan)).toBe(true);
    expect(() => assertManifestMatchesExecutionPlan(manifest, plan)).not.toThrow();
  });

  it('fails assert when sets differ', () => {
    const manifest = parseRoadmapManifestPayload({
      selected_domains: ['marketing_utp'],
      change_scenario: 'hybrid',
      season_preset: 'rolling_90d',
    });
    const plan = {
      selected_domains: ['marketing_utp', 'ux_conversion'],
      depth: 'standard' as const,
      source: 'user_selected' as const,
      include_strategy: true,
    } satisfies AuditExecutionPlan;
    expect(() => assertManifestMatchesExecutionPlan(manifest, plan)).toThrow();
  });
});

describe('dedupeOrchestrationActionNodesByPolicy', () => {
  it('keep_first retains the first node for a duplicate id', () => {
    const a = node({ id: 'x', title: 'First' });
    const b = node({ id: 'x', title: 'Second' });
    const r = dedupeOrchestrationActionNodesByPolicy([a, b], 'keep_first');
    expect(r.nodes).toEqual([a]);
    expect(r.conflicts_resolved).toHaveLength(1);
    expect(r.conflicts_resolved[0]!.id).toMatch(/^dup-id-drop:x:idx/);
  });

  it('keep_last retains the last node for a duplicate id', () => {
    const a = node({ id: 'x', title: 'First' });
    const b = node({ id: 'x', title: 'Second' });
    const r = dedupeOrchestrationActionNodesByPolicy([a, b], 'keep_last');
    expect(r.nodes).toEqual([b]);
    expect(r.conflicts_resolved).toHaveLength(1);
  });
});

describe('orchestrationNodeWeight', () => {
  it('ranks high impact above low impact for equal priority and effort', () => {
    const hi = orchestrationNodeWeight({ impact: 'high', effort: 'low', priority: 'medium' });
    const lo = orchestrationNodeWeight({ impact: 'low', effort: 'low', priority: 'medium' });
    expect(hi).toBeGreaterThan(lo);
  });
});

describe('mapStrategyInitiativesToActionNodes initiative cap', () => {
  function minimalInitiative(id: string): StrategyInitiative {
    return StrategyInitiativeSchema.parse({
      id,
      title: `Title ${id}`,
      description: 'Desc'.repeat(4),
      domain: 'marketing_utp',
      stage: 'growth',
      priority: 'medium',
      impact: 'medium',
      effort: 'medium',
      confidence: 0.8,
      context: { signals: ['S'] },
      outcome: { description: 'Out' },
      scope: { includes: ['A'], excludes: ['B'] },
      execution_paths: [{ type: 'fast', description: 'Q', time_estimate: '1w' }],
      dependencies: [],
      decision: { why_this: ['W'] },
      evidence: { sources: [{ domain_key: 'marketing_utp', signal: 'x' }] },
    });
  }

  it('records conflicts_resolved for initiatives beyond ORCHESTRATION_GRAPH_MAX_NODES', () => {
    const n = ORCHESTRATION_GRAPH_MAX_NODES + 3;
    const initiatives = Array.from({ length: n }, (_, i) => minimalInitiative(`cap-${i}`));
    const { nodes, conflicts_resolved } = mapStrategyInitiativesToActionNodes(initiatives);
    expect(nodes).toHaveLength(ORCHESTRATION_GRAPH_MAX_NODES);
    expect(conflicts_resolved).toHaveLength(3);
    expect(conflicts_resolved[0]!.id).toMatch(/^initiative-cap-drop:cap-/);
    expect(conflicts_resolved.every((c) => c.resolution === 'deterministic')).toBe(true);
  });

  it('includes cap conflicts in buildGlcOrchestrationPackFromInitiatives', () => {
    const n = ORCHESTRATION_GRAPH_MAX_NODES + 1;
    const initiatives = Array.from({ length: n }, (_, i) => minimalInitiative(`pack-${i}`));
    const pack = buildGlcOrchestrationPackFromInitiatives({
      initiatives,
      manifestSnapshotId: '00000000-0000-4000-8000-000000000077',
      seasonPreset: 'rolling_90d',
    });
    expect(pack.graph.nodes).toHaveLength(ORCHESTRATION_GRAPH_MAX_NODES);
    expect(pack.conflicts_resolved.some((c) => c.id.startsWith('initiative-cap-drop:'))).toBe(true);
  });
});

describe('mapStrategyInitiativeToActionNode + buildGlcOrchestrationPackFromInitiatives', () => {
  it('produces a validated pack', () => {
    const initiative = StrategyInitiativeSchema.parse({
      id: 'i1',
      title: 'Initiative one',
      description: 'Desc'.repeat(4),
      domain: 'tech_infrastructure',
      stage: 'growth',
      priority: 'high',
      impact: 'high',
      effort: 'low',
      confidence: 0.8,
      context: { signals: ['S'] },
      outcome: { description: 'Out' },
      scope: { includes: ['A'], excludes: ['B'] },
      execution_paths: [{ type: 'fast', description: 'Q', time_estimate: '1w' }],
      dependencies: [],
      decision: { why_this: ['W'] },
      evidence: { sources: [{ domain_key: 'tech_infrastructure', signal: 'x' }] },
    });
    const action = mapStrategyInitiativeToActionNode(initiative);
    expect(action.lane).toBe('tech_delivery');
    expect(action.source).toBe('strategy');
    const pack = buildGlcOrchestrationPackFromInitiatives({
      initiatives: [initiative],
      manifestSnapshotId: '00000000-0000-4000-8000-000000000099',
      seasonPreset: 'rolling_90d',
    });
    expect(pack.version).toBe(GLC_ORCHESTRATION_PACK_SCHEMA_VERSION);
    expect(pack.critical_path).toContain('i1');
  });

  it('dedupes duplicate initiative ids into a single graph node (keep_first)', () => {
    const first = StrategyInitiativeSchema.parse({
      id: 'dup',
      title: 'Kept title',
      description: 'Desc'.repeat(4),
      domain: 'marketing_utp',
      stage: 'growth',
      priority: 'medium',
      impact: 'medium',
      effort: 'medium',
      confidence: 0.8,
      context: { signals: ['S'] },
      outcome: { description: 'Out' },
      scope: { includes: ['A'], excludes: ['B'] },
      execution_paths: [{ type: 'fast', description: 'Q', time_estimate: '1w' }],
      dependencies: [],
      decision: { why_this: ['W'] },
      evidence: { sources: [{ domain_key: 'marketing_utp', signal: 'x' }] },
    });
    const second = { ...first, title: 'Dropped title' };
    const pack = buildGlcOrchestrationPackFromInitiatives({
      initiatives: [first, second],
      manifestSnapshotId: '00000000-0000-4000-8000-000000000088',
      seasonPreset: 'rolling_90d',
    });
    expect(pack.graph.nodes).toHaveLength(1);
    expect(pack.graph.nodes[0]!.title).toBe('Kept title');
    expect(pack.conflicts_resolved.some((c) => c.id.startsWith('dup-id-drop:'))).toBe(true);
  });
});
