import { describe, expect, it } from 'vitest';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_PACK_SCHEMA_VERSION } from '../../config/orchestration-contract';
import { buildOrchestrationPackDotExport } from '../build-orchestration-pack-dot-export';

function minimalPack(overrides: Partial<GlcOrchestrationPackView> = {}): GlcOrchestrationPackView {
  const base: GlcOrchestrationPackView = {
    version: ORCHESTRATION_PACK_SCHEMA_VERSION,
    graph: {
      nodes: [
        {
          id: 'a',
          title: 'Alpha',
          domain: 'seo_digital',
          lane: 'seo',
        },
        {
          id: 'b',
          title: 'Beta',
          domain: 'tech_infrastructure',
          lane: 'tech_delivery',
        },
      ],
      edges: [{ from: 'a', to: 'b', relation: 'strong' }],
    },
    lanes: { seo: ['a'], tech_delivery: ['b'], product_change: [], marketing_narrative: [], processes_automation: [], risk_compliance: [] },
    critical_path: ['a', 'b'],
    conflicts_resolved: [],
    manifest_snapshot_id: 'snap-1',
    ...overrides,
  };
  return base;
}

describe('buildOrchestrationPackDotExport', () => {
  it('emits digraph with labels and edge', () => {
    const dot = buildOrchestrationPackDotExport(minimalPack(), { maxEdges: 10 });
    expect(dot).toContain('digraph glc_orchestration');
    expect(dot).toContain('[label="Alpha"]');
    expect(dot).toContain('[label="Beta"]');
    expect(dot).toMatch(/n\d+ -> n\d+;/);
  });

  it('escapes quotes in titles', () => {
    const pack = minimalPack();
    pack.graph.nodes[0].title = 'Say "hello"';
    const dot = buildOrchestrationPackDotExport(pack, { maxEdges: 10 });
    expect(dot).toContain('\\"hello\\"');
  });

  it('respects maxEdges', () => {
    const pack = minimalPack();
    pack.graph.edges = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' },
    ];
    const dotOne = buildOrchestrationPackDotExport(pack, { maxEdges: 1 });
    const arrowMatches = dotOne.match(/->/g);
    expect(arrowMatches?.length).toBe(1);
  });
});
