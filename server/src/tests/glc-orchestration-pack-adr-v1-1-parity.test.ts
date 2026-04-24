import { describe, expect, it } from 'vitest';
import { GlcOrchestrationPackSchemaV2 } from '../schemas/glc-orchestration-pack.js';
import { GLC_ORCHESTRATION_PACK_SCHEMA_VERSION, ORCHESTRATION_DEFAULT_INPUT_QUALITY } from '../config/orchestration-graph-policy.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';
import { STRATEGY_INITIATIVE_DOMAIN_KEYS } from '../config/strategy-initiative-policy.js';

/**
 * ADR-GLC-ORCHESTRATOR-V1.1 "Unified output" + persistence contract maps to
 * `GlcOrchestrationPackSchemaV2` top-level fields (see docs/adrs/ADR-GLC-ORCHESTRATOR-V1.1-META-DIRECTOR.md § Unified output / README DoD).
 * When the ADR adds new persisted sections, extend this list and the Zod schema in the same PR.
 * Includes **optional** plan-level `control_object` (ADR plan-level V4) when present in Zod.
 */
const ADR_V11_PERSISTED_PACK_TOP_LEVEL_KEYS = [
  'version',
  'graph',
  'lanes',
  'critical_path',
  'conflicts_resolved',
  'manifest_snapshot_id',
  'phase_diagnostic',
  'routing_profile',
  'execution_mode',
  'confidence_map',
  'risk_layer',
  'domain_influence',
  'input_quality',
  'top_7d',
  'top_30d',
  'top_actions',
  'data_gaps',
  'compressed_plan',
  'metrics_framework',
  'control_object',
  'system_diagnosis',
] as const;

/** Full domain weight map for `routing_profile` / `domain_influence` (ADR: dynamic routing over all initiative domains). */
const FULL_DOMAIN_WEIGHTS = Object.fromEntries(
  STRATEGY_INITIATIVE_DOMAIN_KEYS.map((d) => [d, 1]),
) as Record<(typeof STRATEGY_INITIATIVE_DOMAIN_KEYS)[number], number>;

describe('GlcOrchestrationPackSchemaV2 ADR v1.1 field coverage', () => {
  it('exposes all ADR-v1.1 top-level pack keys in the Zod v2 shape', () => {
    const shape = GlcOrchestrationPackSchemaV2.shape;
    for (const k of ADR_V11_PERSISTED_PACK_TOP_LEVEL_KEYS) {
      expect(k in shape, `Missing schema field for ADR v1.1 key: ${k}`).toBe(true);
    }
  });

  it('accepts a v2 payload with ADR v1.1 nested sections (routing, confidence unlocks, risk cross_domain, metrics, data_gaps)', () => {
    const nodeId = 'n1';
    const lanes = Object.fromEntries(ORCHESTRATION_LANE_IDS.map((l) => [l, l === 'marketing_narrative' ? [nodeId] : []])) as Record<
      (typeof ORCHESTRATION_LANE_IDS)[number],
      string[]
    >;
    const raw = {
      version: GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
      graph: {
        nodes: [
          {
            id: nodeId,
            title: 'Initiative A',
            domain: 'marketing_utp' as const,
            lane: 'marketing_narrative' as const,
            evidence_taxonomy: { observed: 1, derived: 0, assumed: 0, missing: 0 },
            evidence_refs: ['intake:q1'],
          },
        ],
        edges: [],
      },
      lanes,
      critical_path: [nodeId],
      conflicts_resolved: [],
      manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
      phase_diagnostic: {
        dominant_constraint: 'capacity' as const,
        constraint_chain: ['capacity' as const],
      },
      routing_profile: {
        strategy: 'toc_dynamic_routing_v1' as const,
        domain_weights: { ...FULL_DOMAIN_WEIGHTS, marketing_utp: 1.5 },
      },
      execution_mode: 'deterministic' as const,
      confidence_map: {
        node_confidence: { [nodeId]: 'high' as const },
        unlock_conditions: ['Need crawl completion for /pricing'],
      },
      risk_layer: {
        node_risk: { [nodeId]: 2 },
        cross_domain: [
          {
            domains: ['marketing_utp' as const, 'tech_infrastructure' as const],
            risk: 3,
            note: 'GTM and deploy coupling',
          },
        ],
      },
      domain_influence: { domain_weights: FULL_DOMAIN_WEIGHTS },
      input_quality: ORCHESTRATION_DEFAULT_INPUT_QUALITY,
      top_7d: [nodeId],
      top_30d: [nodeId],
      top_actions: {
        top_actions_7d: [nodeId],
        top_actions_30d: [nodeId, nodeId],
      },
      data_gaps: {
        degraded_input: false,
        dangling_dependencies: 0,
        missing_confidence: 0,
        missing_risk: 0,
      },
      compressed_plan: false,
      metrics_framework: {
        north_star: 'Revenue per visitor',
        leading: ['trial_starts'],
        lagging: ['mrr'],
      },
    };
    const parsed = GlcOrchestrationPackSchemaV2.safeParse(raw);
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.format())).toBe(true);
    if (parsed.success) {
      expect(parsed.data.confidence_map.unlock_conditions?.[0]).toMatch(/crawl/);
      expect(parsed.data.risk_layer.cross_domain?.[0].domains[0]).toBe('marketing_utp');
      expect(parsed.data.routing_profile.domain_weights.marketing_utp).toBe(1.5);
    }
  });

  it('accepts optional plan-level control_object (ADR V4) nested in v2 pack', () => {
    const nodeId = 'n1';
    const lanes = Object.fromEntries(ORCHESTRATION_LANE_IDS.map((l) => [l, l === 'marketing_narrative' ? [nodeId] : []])) as Record<
      (typeof ORCHESTRATION_LANE_IDS)[number],
      string[]
    >;
    const base = {
      version: GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
      graph: {
        nodes: [
          {
            id: nodeId,
            title: 'Initiative A',
            domain: 'marketing_utp' as const,
            lane: 'marketing_narrative' as const,
            evidence_taxonomy: { observed: 1, derived: 0, assumed: 0, missing: 0 },
            evidence_refs: ['intake:q1'],
          },
        ],
        edges: [],
      },
      lanes,
      critical_path: [nodeId],
      conflicts_resolved: [],
      manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
      phase_diagnostic: {
        dominant_constraint: 'capacity' as const,
        constraint_chain: ['capacity' as const],
      },
      routing_profile: {
        strategy: 'toc_dynamic_routing_v1' as const,
        domain_weights: { ...FULL_DOMAIN_WEIGHTS, marketing_utp: 1.2 },
      },
      execution_mode: 'deterministic' as const,
      confidence_map: { node_confidence: { [nodeId]: 'high' as const } },
      risk_layer: { node_risk: { [nodeId]: 1 } },
      domain_influence: { domain_weights: FULL_DOMAIN_WEIGHTS },
      input_quality: ORCHESTRATION_DEFAULT_INPUT_QUALITY,
      control_object: {
        objective: 'Ship the revised GTM plan with measurable north-star',
        constraints: ['Budget capped at prior quarter'],
        exit_criteria: ['KPI review signed off'],
        escalation_rules: ['Block launch if crawl health regresses'],
      },
    };
    const parsed = GlcOrchestrationPackSchemaV2.safeParse(base);
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.format())).toBe(true);
    if (parsed.success) {
      expect(parsed.data.control_object?.objective).toMatch(/GTM/);
      expect(parsed.data.control_object?.constraints?.[0]).toMatch(/Budget/);
    }
  });
});
