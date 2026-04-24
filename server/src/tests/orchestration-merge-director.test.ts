import { describe, expect, it } from 'vitest';
import type { DomainKey } from '@glc/intake-core';

import { ORCHESTRATION_GRAPH_MAX_NODES } from '../config/orchestration-graph-policy.js';
import { ORCHESTRATION_NODE_SOURCE_DIRECTOR, ORCHESTRATION_NODE_SOURCE_STRATEGY } from '../config/director-orchestration-policy.js';
import {
  GlcDirectorOrchestrationSliceSchema,
  isStrictReadyDirectorSlice,
  type GlcDirectorOrchestrationSlice,
} from '../schemas/glc-director-orchestration-slice.js';
import { StrategyInitiativeSchema } from '../schemas/domain-output.js';
import { buildGlcOrchestrationPackFromActionNodes } from '../services/orchestration/build-glc-orchestration-pack.js';
import { mergeOrchestrationActionInputs } from '../services/orchestration/merge-orchestration-action-inputs.js';
import { mapStrategyInitiativesToActionNodes } from '../services/orchestration/map-strategy-initiative-to-action-node.js';
import { mapDirectorWaveBundleToActionNodes } from '../services/orchestration/map-domain-director-bundle-to-action-nodes.js';

function minimalInitiative(id: string) {
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

describe('GlcDirectorOrchestrationSliceSchema', () => {
  it('parses baseline and deep wave bundles', () => {
    const raw = {
      schema_version: 1,
      baseline: {
        zones: ['z1'],
        actions: [
          {
            id: 'a1',
            title: 'Baseline action',
            impact: 4,
            effort: 2,
            risk: 2,
            urgency: 3,
            confidence: 'high' as const,
            dependencies: [],
          },
        ],
      },
      deep: {
        actions: [
          {
            id: 'd1',
            title: 'Deep action',
            impact: 5,
            effort: 3,
            risk: 2,
            urgency: 4,
            confidence: 'medium' as const,
            dependencies: [],
          },
        ],
      },
    };
    const p = GlcDirectorOrchestrationSliceSchema.safeParse(raw);
    expect(p.success).toBe(true);
    expect(p.data?.baseline?.actions).toHaveLength(1);
    expect(p.data?.deep?.actions).toHaveLength(1);
  });

  it('marks deep-only slices as not strict-ready', () => {
    const deepOnly = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      deep: {
        actions: [
          {
            id: 'd-only',
            title: 'Deep action',
            impact: 4,
            effort: 3,
            risk: 2,
            urgency: 4,
            confidence: 'medium',
            dependencies: [],
          },
        ],
      },
    });
    const withBaseline = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'b-only',
            title: 'Baseline action',
            impact: 4,
            effort: 3,
            risk: 2,
            urgency: 4,
            confidence: 'medium',
            dependencies: [],
          },
        ],
      },
    });
    expect(isStrictReadyDirectorSlice(deepOnly)).toBe(false);
    expect(isStrictReadyDirectorSlice(withBaseline)).toBe(true);
  });
});

describe('mapDirectorWaveBundleToActionNodes', () => {
  it('prefixes ids and sets director source and analysis_depth', () => {
    const bundle = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      deep: {
        actions: [
          {
            id: 'x',
            title: 'T',
            impact: 5,
            effort: 2,
            risk: 2,
            urgency: 5,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
    });
    const r = mapDirectorWaveBundleToActionNodes({
      domainKey: 'seo_digital',
      wave: 'deep',
      bundle: bundle.deep!,
    });
    expect(r.nodes).toHaveLength(1);
    expect(r.nodes[0]!.id).toBe('dir:seo_digital:deep:x');
    expect(r.nodes[0]!.source).toBe(ORCHESTRATION_NODE_SOURCE_DIRECTOR);
    expect(r.nodes[0]!.analysis_depth).toBe('deep');
    expect(r.nodes[0]!.domain).toBe('seo_digital');
  });

  it('copies evidence taxonomy counts onto action nodes when director evidence is present', () => {
    const bundle = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'with-evidence',
            title: 'Has taxonomy',
            impact: 3,
            effort: 2,
            risk: 2,
            urgency: 3,
            confidence: 'high',
            dependencies: [],
            evidence: {
              observed: ['crawl showed thin content'],
              derived: ['inferred from SERP'],
              assumed: [],
              missing: ['no GSC export'],
            },
          },
        ],
      },
    });
    const r = mapDirectorWaveBundleToActionNodes({
      domainKey: 'seo_digital',
      wave: 'baseline',
      bundle: bundle.baseline!,
    });
    expect(r.nodes[0]!.evidence_taxonomy).toEqual({
      observed: 1,
      derived: 1,
      assumed: 0,
      missing: 1,
    });
  });

  it('marks node source as sub_agent when director action id has sub-agent prefix', () => {
    const bundle = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      deep: {
        actions: [
          {
            id: 'sub_agent:cmo.agent_3_positioning:positioning_statement',
            title: 'Positioning statement',
            impact: 4,
            effort: 3,
            risk: 2,
            urgency: 4,
            confidence: 'medium',
            dependencies: [],
          },
        ],
      },
    });
    const r = mapDirectorWaveBundleToActionNodes({
      domainKey: 'marketing_utp',
      wave: 'deep',
      bundle: bundle.deep!,
    });
    expect(r.nodes[0]?.source).toBe('sub_agent:cmo.agent_3_positioning');
  });

  it('emits conflict for missing evidence taxonomy in director action', () => {
    const bundle = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'evidence-gap',
            title: 'No evidence',
            impact: 3,
            effort: 2,
            risk: 3,
            urgency: 3,
            confidence: 'medium',
            dependencies: [],
          },
        ],
      },
    });
    const r = mapDirectorWaveBundleToActionNodes({
      domainKey: 'marketing_utp',
      wave: 'baseline',
      bundle: bundle.baseline!,
    });
    expect(r.conflicts_resolved.some(row => row.id.includes('director-evidence-missing'))).toBe(true);
  });
});

describe('mergeOrchestrationActionInputs', () => {
  it('merges baseline and deep director actions for the same domain', () => {
    const slice = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'b1',
            title: 'Baseline row',
            impact: 4,
            effort: 2,
            risk: 2,
            urgency: 4,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
      deep: {
        actions: [
          {
            id: 'd1',
            title: 'Deep row',
            impact: 5,
            effort: 2,
            risk: 2,
            urgency: 5,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
    });
    const merged = mergeOrchestrationActionInputs({
      strategyNodes: mapStrategyInitiativesToActionNodes([minimalInitiative('strat-1')]).nodes,
      slicesByDomain: new Map<DomainKey, GlcDirectorOrchestrationSlice>([['marketing_utp', slice]]),
      selectedDomains: ['marketing_utp'],
    });
    const depths = new Set(merged.nodes.map(n => n.analysis_depth).filter(Boolean));
    expect(depths.has('baseline')).toBe(true);
    expect(depths.has('deep')).toBe(true);
    expect(merged.nodes.some(n => n.id.includes('dir:marketing_utp:baseline:b1'))).toBe(true);
    expect(merged.nodes.some(n => n.id.includes('dir:marketing_utp:deep:d1'))).toBe(true);
  });

  it('uses director nodes as canonical source for covered domains and respects merge cap', () => {
    const initiatives = Array.from({ length: ORCHESTRATION_GRAPH_MAX_NODES - 2 }, (_, i) =>
      minimalInitiative(`s-${i}`),
    );
    const strategyMapped = mapStrategyInitiativesToActionNodes(initiatives);
    const slice = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'd1',
            title: 'D1',
            impact: 3,
            effort: 2,
            risk: 2,
            urgency: 3,
            confidence: 'high',
            dependencies: [],
          },
          {
            id: 'd2',
            title: 'D2',
            impact: 3,
            effort: 2,
            risk: 2,
            urgency: 3,
            confidence: 'high',
            dependencies: [],
          },
          {
            id: 'd3',
            title: 'D3',
            impact: 3,
            effort: 2,
            risk: 2,
            urgency: 3,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
    });
    const sliceIndex = new Map<DomainKey, GlcDirectorOrchestrationSlice>([['marketing_utp', slice]]);
    const merged = mergeOrchestrationActionInputs({
      strategyNodes: strategyMapped.nodes,
      slicesByDomain: sliceIndex,
      selectedDomains: ['marketing_utp'],
    });
    expect(merged.nodes.length).toBeLessThanOrEqual(ORCHESTRATION_GRAPH_MAX_NODES);
    const directorNodes = merged.nodes.filter(n => n.source === ORCHESTRATION_NODE_SOURCE_DIRECTOR);
    expect(directorNodes.length).toBeGreaterThan(0);
    expect(merged.nodes.some(n => n.source === ORCHESTRATION_NODE_SOURCE_STRATEGY)).toBe(false);
    expect(merged.conflicts_resolved.some(c => c.id === 'strategy-replaced-by-director')).toBe(true);
  });

  it('keeps strategy nodes as fallback when director slice is absent for a domain', () => {
    const initiatives = [minimalInitiative('fallback-s-1')];
    const strategyMapped = mapStrategyInitiativesToActionNodes(initiatives);
    const merged = mergeOrchestrationActionInputs({
      strategyNodes: strategyMapped.nodes,
      slicesByDomain: new Map<DomainKey, GlcDirectorOrchestrationSlice>(),
      selectedDomains: ['marketing_utp'],
    });
    expect(merged.nodes).toHaveLength(1);
    expect(merged.nodes[0]?.source).toBe(ORCHESTRATION_NODE_SOURCE_STRATEGY);
  });

  it('retains strategy dependency anchors when director nodes reference strategy ids', () => {
    const initiativeA = minimalInitiative('anchor:strategy:node');
    const initiativeB = minimalInitiative('other-strategy-node');
    const strategyMapped = mapStrategyInitiativesToActionNodes([initiativeA, initiativeB]);
    const slice = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'dir-with-anchor-dep',
            title: 'Director action with strategy anchor',
            impact: 4,
            effort: 2,
            risk: 2,
            urgency: 4,
            confidence: 'high',
            dependencies: ['anchor:strategy:node'],
          },
        ],
      },
    });
    const merged = mergeOrchestrationActionInputs({
      strategyNodes: strategyMapped.nodes,
      slicesByDomain: new Map<DomainKey, GlcDirectorOrchestrationSlice>([['marketing_utp', slice]]),
      selectedDomains: ['marketing_utp'],
    });
    expect(merged.nodes.some((node) => node.id === 'anchor:strategy:node')).toBe(true);
    expect(merged.nodes.some((node) => node.id === 'other-strategy-node')).toBe(false);
    expect(merged.conflicts_resolved.some((row) => row.id === 'strategy-replaced-by-director')).toBe(true);
  });

  it('keeps strategy nodes when director slice is deep-only without baseline coverage', () => {
    const strategyMapped = mapStrategyInitiativesToActionNodes([minimalInitiative('strategy-deep-only-fallback')]);
    const deepOnlySlice = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      deep: {
        actions: [
          {
            id: 'deep-only-node',
            title: 'Deep only action',
            impact: 4,
            effort: 3,
            risk: 2,
            urgency: 4,
            confidence: 'medium',
            dependencies: [],
          },
        ],
      },
    });
    const merged = mergeOrchestrationActionInputs({
      strategyNodes: strategyMapped.nodes,
      slicesByDomain: new Map<DomainKey, GlcDirectorOrchestrationSlice>([['marketing_utp', deepOnlySlice]]),
      selectedDomains: ['marketing_utp'],
    });
    expect(merged.nodes.some((node) => node.id === 'strategy-deep-only-fallback')).toBe(true);
    expect(merged.nodes.some((node) => node.id === 'dir:marketing_utp:deep:deep-only-node')).toBe(true);
    expect(merged.input_quality.fallback_reason_code).toBe('director_slice_partial');
  });

  it('sets invalid fallback reason when director parse status is invalid', () => {
    const strategyMapped = mapStrategyInitiativesToActionNodes([minimalInitiative('fallback-invalid')]);
    const merged = mergeOrchestrationActionInputs({
      strategyNodes: strategyMapped.nodes,
      slicesByDomain: new Map<DomainKey, GlcDirectorOrchestrationSlice>(),
      selectedDomains: ['marketing_utp'],
      inputStatusByDomain: new Map<DomainKey, 'valid' | 'invalid' | 'missing'>([['marketing_utp', 'invalid']]),
    });
    expect(merged.input_quality.input_mode).toBe('strategy_fallback');
    expect(merged.input_quality.fallback_reason_code).toBe('director_slice_invalid');
    expect(merged.input_quality.degraded).toBe(true);
  });

  it('merges director baseline nodes from multiple domains in sorted domain order', () => {
    const mkSlice = (actionId: string) =>
      GlcDirectorOrchestrationSliceSchema.parse({
        schema_version: 1,
        baseline: {
          actions: [
            {
              id: actionId,
              title: `T ${actionId}`,
              impact: 4,
              effort: 2,
              risk: 2,
              urgency: 4,
              confidence: 'high',
              dependencies: [],
            },
          ],
        },
      });
    const slices = new Map<DomainKey, GlcDirectorOrchestrationSlice>([
      ['marketing_utp', mkSlice('m1')],
      ['seo_digital', mkSlice('s1')],
      ['tech_infrastructure', mkSlice('t1')],
    ]);
    const merged = mergeOrchestrationActionInputs({
      strategyNodes: [],
      slicesByDomain: slices,
      selectedDomains: ['marketing_utp', 'seo_digital', 'tech_infrastructure'],
    });
    const directorIds = merged.nodes.filter(n => n.source === ORCHESTRATION_NODE_SOURCE_DIRECTOR).map(n => n.id);
    expect(directorIds).toEqual([
      'dir:marketing_utp:baseline:m1',
      'dir:seo_digital:baseline:s1',
      'dir:tech_infrastructure:baseline:t1',
    ]);
  });
});

describe('buildGlcOrchestrationPackFromActionNodes graph node metadata', () => {
  it('persists director source and analysis_depth on graph nodes', () => {
    const initiatives = [minimalInitiative('only-one')];
    const strategyMapped = mapStrategyInitiativesToActionNodes(initiatives);
    const slice = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'b1',
            title: 'Dir',
            impact: 4,
            effort: 2,
            risk: 2,
            urgency: 4,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
    });
    const merged = mergeOrchestrationActionInputs({
      strategyNodes: strategyMapped.nodes,
      slicesByDomain: new Map<DomainKey, GlcDirectorOrchestrationSlice>([['marketing_utp', slice]]),
      selectedDomains: ['marketing_utp'],
    });
    const pack = buildGlcOrchestrationPackFromActionNodes({
      nodes: merged.nodes,
      preGraphConflicts: [...strategyMapped.conflicts_resolved, ...merged.conflicts_resolved],
      manifestSnapshotId: '00000000-0000-4000-8000-0000000000aa',
      seasonPreset: 'rolling_90d',
    });
    const dirNode = pack.graph.nodes.find(n => n.id.includes('dir:marketing_utp'));
    expect(pack.graph.nodes.some(n => n.id === 'only-one')).toBe(false);
    expect(dirNode?.source).toBe('director');
    expect(dirNode?.analysis_depth).toBe('baseline');
  });

  it('builds a smaller strategy-only pack graph when director slice is absent', () => {
    const initiative = minimalInitiative('solo-strategy');
    const strategyMapped = mapStrategyInitiativesToActionNodes([initiative]);
    const mergedWithoutDirector = mergeOrchestrationActionInputs({
      strategyNodes: strategyMapped.nodes,
      slicesByDomain: new Map(),
      selectedDomains: ['marketing_utp'],
    });
    const slice = GlcDirectorOrchestrationSliceSchema.parse({
      schema_version: 1,
      baseline: {
        actions: [
          {
            id: 'dir-only',
            title: 'Director replaces',
            impact: 4,
            effort: 2,
            risk: 2,
            urgency: 4,
            confidence: 'high',
            dependencies: [],
          },
        ],
      },
    });
    const mergedWithDirector = mergeOrchestrationActionInputs({
      strategyNodes: strategyMapped.nodes,
      slicesByDomain: new Map<DomainKey, GlcDirectorOrchestrationSlice>([['marketing_utp', slice]]),
      selectedDomains: ['marketing_utp'],
    });
    const packStrategyOnly = buildGlcOrchestrationPackFromActionNodes({
      nodes: mergedWithoutDirector.nodes,
      preGraphConflicts: [...strategyMapped.conflicts_resolved, ...mergedWithoutDirector.conflicts_resolved],
      manifestSnapshotId: '00000000-0000-4000-8000-0000000000bb',
      seasonPreset: 'rolling_90d',
    });
    const packDirector = buildGlcOrchestrationPackFromActionNodes({
      nodes: mergedWithDirector.nodes,
      preGraphConflicts: [...strategyMapped.conflicts_resolved, ...mergedWithDirector.conflicts_resolved],
      manifestSnapshotId: '00000000-0000-4000-8000-0000000000bc',
      seasonPreset: 'rolling_90d',
    });
    expect(packStrategyOnly.graph.nodes.some(n => n.id === 'solo-strategy')).toBe(true);
    expect(packDirector.graph.nodes.some(n => n.id === 'solo-strategy')).toBe(false);
    expect(packDirector.graph.nodes.some(n => n.id.includes('dir:marketing_utp'))).toBe(true);
  });
});
