import { describe, expect, it, vi, beforeEach } from 'vitest';

const ffMock = vi.hoisted(() => ({ enabled: false, rolloutPercent: 0 }));
const invokeMock = vi.hoisted(() => vi.fn());

vi.mock('../config/feature-flags.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationConflictSynthesisEnabled: () => ffMock.enabled,
    getOrchestrationConflictSynthesisRolloutPercent: () => ffMock.rolloutPercent,
  };
});

vi.mock('../services/orchestration/orchestration-pack-synthesis-claude.js', () => ({
  invokeOrchestrationPackSynthesisClaude: invokeMock,
}));

vi.mock('../agents/base.js', () => ({
  loadPrompt: () => 'Orchestrator synthesis system prompt.',
}));

vi.mock('../services/token-tracker.js', () => ({
  TokenTracker: class {
    checkBudget = vi.fn(async () => ({
      within_budget: true,
      remaining: 50_000,
      tokens_used: 0,
      token_budget: 200_000,
      is_approaching_limit: false,
    }));
    log = vi.fn(async () => {});
  },
}));

vi.mock('../services/pipeline/events/insert-pipeline-event.js', () => ({
  insertPipelineEventRow: vi.fn(async () => {}),
}));

import { GLC_ORCHESTRATION_PACK_SCHEMA_VERSION } from '../config/orchestration-graph-policy.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';
import { ORCHESTRATION_SYNTHESIS_CONFLICT_ID_PREFIX } from '../config/orchestration-synthesis-policy.js';
import type { GlcOrchestrationPack } from '../schemas/glc-orchestration-pack.js';
import { GlcOrchestrationSynthesisToolSchema } from '../schemas/glc-orchestration-synthesis-tool.js';
import { buildOrchestrationSynthesisUserJson } from '../services/orchestration/orchestration-synthesis-context.js';
import {
  mergeOrchestrationSynthesisIntoPack,
  runOrchestrationSynthesisIfEnabled,
} from '../services/orchestration/orchestration-synthesis.service.js';

const MANIFEST_ID = '00000000-0000-4000-8000-000000000001';

function minimalPack(overrides?: Partial<GlcOrchestrationPack>): GlcOrchestrationPack {
  const base: GlcOrchestrationPack = {
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
    lanes: Object.fromEntries(ORCHESTRATION_LANE_IDS.map((l) => [l, l === 'marketing_narrative' ? ['a'] : []])) as GlcOrchestrationPack['lanes'],
    critical_path: ['a'],
    conflicts_resolved: [{ id: 'det-1', summary: 'Deterministic', resolution: 'deterministic' }],
    manifest_snapshot_id: MANIFEST_ID,
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
      input_gate_status: 'finalized',
      director_coverage_ratio: 1,
      director_input_coverage_ratio: 1,
      degraded: false,
    },
  };
  return { ...base, ...overrides };
}

describe('mergeOrchestrationSynthesisIntoPack', () => {
  it('prefixes model conflict ids and appends rows', () => {
    const base = minimalPack();
    const synth = GlcOrchestrationSynthesisToolSchema.parse({
      dominant_constraint: 'TECH constrained',
      constraint_chain_notes: [],
      conflicts_resolved: [
        { id: 'growth_vs_risk', summary: 'Sequence growth after baseline.', resolution: 'synthesis_applied' },
      ],
    });
    const merged = mergeOrchestrationSynthesisIntoPack(base, synth);
    expect(merged.conflicts_resolved).toHaveLength(2);
    expect(merged.conflicts_resolved[1]?.id).toBe(`${ORCHESTRATION_SYNTHESIS_CONFLICT_ID_PREFIX}growth_vs_risk`);
    expect(merged.conflicts_resolved[1]?.resolution).toBe('synthesis_applied');
    expect(merged.graph.nodes).toEqual(base.graph.nodes);
    expect(merged.graph.edges).toEqual(base.graph.edges);
    expect(merged.critical_path).toEqual(base.critical_path);
  });

  it('skips LLM row when prefixed id collides with deterministic id', () => {
    const prefixed = `${ORCHESTRATION_SYNTHESIS_CONFLICT_ID_PREFIX}x`;
    const base = minimalPack({
      conflicts_resolved: [{ id: prefixed, summary: 'Existing', resolution: 'deterministic' }],
    });
    const synth = GlcOrchestrationSynthesisToolSchema.parse({
      dominant_constraint: 'RISK constrained',
      constraint_chain_notes: [],
      conflicts_resolved: [{ id: 'x', summary: 'Dup', resolution: 'synthesis_pending' }],
    });
    const merged = mergeOrchestrationSynthesisIntoPack(base, synth);
    expect(merged.conflicts_resolved.filter((c) => c.id === prefixed)).toHaveLength(1);
  });
});

describe('buildOrchestrationSynthesisUserJson', () => {
  it('includes pack and scorecard fields when small', () => {
    const pack = minimalPack();
    const json = buildOrchestrationSynthesisUserJson({
      pack,
      normalizedStrategy: { overall_score: 4, scorecard: [{ domain_key: 'marketing_utp', score: 3 }] },
      domainRows: [
        {
          domain_key: 'marketing_utp',
          score: 3,
          label: 'Moderate',
          issues: [{ title: 'Weak CTA' }],
        },
      ],
    });
    const parsed = JSON.parse(json) as { deterministic_orchestration_pack?: GlcOrchestrationPack };
    expect(parsed.deterministic_orchestration_pack?.critical_path).toEqual(['a']);
  });

  it('includes roadmap_input_manifest when roadmapManifest is provided', () => {
    const pack = minimalPack();
    const json = buildOrchestrationSynthesisUserJson({
      pack,
      normalizedStrategy: {},
      domainRows: [],
      roadmapManifest: {
        schema_version: 1,
        selected_domains: ['marketing_utp'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
      },
    });
    const parsed = JSON.parse(json) as {
      roadmap_input_manifest?: { change_scenario: string; season_preset: string };
    };
    expect(parsed.roadmap_input_manifest?.change_scenario).toBe('hybrid');
    expect(parsed.roadmap_input_manifest?.season_preset).toBe('rolling_90d');
  });
});

describe('runOrchestrationSynthesisIfEnabled', () => {
  beforeEach(() => {
    ffMock.enabled = false;
    ffMock.rolloutPercent = 0;
    invokeMock.mockReset();
  });

  it('returns deterministic pack when feature flag is off', async () => {
    const det = minimalPack();
    const out = await runOrchestrationSynthesisIfEnabled({
      auditId: 'audit-1',
      deterministicPack: det,
      normalizedStrategy: {},
      domainRows: [],
    });
    expect(out).toEqual(det);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('falls back to deterministic pack when Claude invoke fails', async () => {
    ffMock.enabled = true;
    ffMock.rolloutPercent = 100;
    invokeMock.mockRejectedValue(new Error('upstream'));
    const det = minimalPack();
    const out = await runOrchestrationSynthesisIfEnabled({
      auditId: 'audit-2',
      deterministicPack: det,
      normalizedStrategy: { overall_score: 3 },
      domainRows: [],
    });
    expect(out.conflicts_resolved).toEqual(det.conflicts_resolved);
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it('merges when Claude returns valid synthesis', async () => {
    ffMock.enabled = true;
    ffMock.rolloutPercent = 100;
    invokeMock.mockResolvedValue(
      GlcOrchestrationSynthesisToolSchema.parse({
        dominant_constraint: 'CONVERSION constrained',
        constraint_chain_notes: ['Then scale demand'],
        conflicts_resolved: [
          { id: 'ux_before_scale', summary: 'Fix conversion before paid acquisition.', resolution: 'synthesis_applied' },
        ],
      }),
    );
    const det = minimalPack();
    const out = await runOrchestrationSynthesisIfEnabled({
      auditId: 'audit-3',
      deterministicPack: det,
      normalizedStrategy: {},
      domainRows: [],
    });
    expect(out.conflicts_resolved.length).toBe(2);
    expect(out.conflicts_resolved.some((c) => c.resolution === 'synthesis_applied')).toBe(true);
  });

  it('skips synthesis when audit is outside rollout segment', async () => {
    ffMock.enabled = true;
    ffMock.rolloutPercent = 0;
    const det = minimalPack();
    const out = await runOrchestrationSynthesisIfEnabled({
      auditId: 'audit-outside',
      deterministicPack: det,
      normalizedStrategy: {},
      domainRows: [],
    });
    expect(out).toEqual(det);
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('invokes Claude when audit id falls inside partial rollout window', async () => {
    function auditBucketPercent(auditId: string): number {
      let hash = 0;
      for (let i = 0; i < auditId.length; i += 1) {
        hash = (hash * 31 + auditId.charCodeAt(i)) >>> 0;
      }
      return hash % 100;
    }
    let auditIdInRollout = '';
    for (let i = 0; i < 400; i += 1) {
      const candidate = `audit-rollout-probe-${i}`;
      if (auditBucketPercent(candidate) < 40) {
        auditIdInRollout = candidate;
        break;
      }
    }
    expect(auditIdInRollout).not.toBe('');

    ffMock.enabled = true;
    ffMock.rolloutPercent = 40;
    invokeMock.mockResolvedValue(
      GlcOrchestrationSynthesisToolSchema.parse({
        dominant_constraint: 'TEST',
        constraint_chain_notes: [],
        conflicts_resolved: [{ id: 'rollout_hit', summary: 'In segment', resolution: 'synthesis_applied' }],
      }),
    );
    const det = minimalPack();
    const out = await runOrchestrationSynthesisIfEnabled({
      auditId: auditIdInRollout,
      deterministicPack: det,
      normalizedStrategy: {},
      domainRows: [],
    });
    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(out.conflicts_resolved.length).toBeGreaterThan(det.conflicts_resolved.length);
  });
});
