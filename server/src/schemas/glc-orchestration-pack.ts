import { z } from 'zod';

import { CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS } from '@glc/intake-core';

import {
  ORCHESTRATION_CONSTRAINT_KEYS,
  GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
  ORCHESTRATION_DEPENDENCY_RELATION_KINDS,
  ORCHESTRATION_DEPENDENCY_RELATION_WEIGHTS,
  ORCHESTRATION_CONFLICT_RESOLUTIONS,
  ORCHESTRATION_EXECUTION_MODES,
  ORCHESTRATION_FALLBACK_REASON_CODES,
  ORCHESTRATION_GRAPH_NODE_ANALYSIS_DEPTHS,
  ORCHESTRATION_INPUT_GATE_STATUSES,
  ORCHESTRATION_INPUT_MODES,
  ORCHESTRATION_GRAPH_NODE_SOURCES,
  ORCHESTRATION_DEFAULT_INPUT_QUALITY,
} from '../config/orchestration-graph-policy.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';
import { STRATEGY_INITIATIVE_DOMAIN_KEYS } from '../config/strategy-initiative-policy.js';

const laneTuple = [...ORCHESTRATION_LANE_IDS] as [
  (typeof ORCHESTRATION_LANE_IDS)[number],
  ...(typeof ORCHESTRATION_LANE_IDS)[number][],
];

const initiativeDomainTuple = [...STRATEGY_INITIATIVE_DOMAIN_KEYS] as [
  (typeof STRATEGY_INITIATIVE_DOMAIN_KEYS)[number],
  ...(typeof STRATEGY_INITIATIVE_DOMAIN_KEYS)[number][],
];

const orchestrationConflictResolutionTuple = [...ORCHESTRATION_CONFLICT_RESOLUTIONS] as [
  (typeof ORCHESTRATION_CONFLICT_RESOLUTIONS)[number],
  ...(typeof ORCHESTRATION_CONFLICT_RESOLUTIONS)[number][],
];

const graphNodeSourceTuple = [...ORCHESTRATION_GRAPH_NODE_SOURCES] as [
  (typeof ORCHESTRATION_GRAPH_NODE_SOURCES)[number],
  ...(typeof ORCHESTRATION_GRAPH_NODE_SOURCES)[number][],
];

const graphNodeAnalysisDepthTuple = [...ORCHESTRATION_GRAPH_NODE_ANALYSIS_DEPTHS] as [
  (typeof ORCHESTRATION_GRAPH_NODE_ANALYSIS_DEPTHS)[number],
  ...(typeof ORCHESTRATION_GRAPH_NODE_ANALYSIS_DEPTHS)[number][],
];

const dependencyRelationTuple = [...ORCHESTRATION_DEPENDENCY_RELATION_KINDS] as [
  (typeof ORCHESTRATION_DEPENDENCY_RELATION_KINDS)[number],
  ...(typeof ORCHESTRATION_DEPENDENCY_RELATION_KINDS)[number][],
];

const constraintTuple = [...ORCHESTRATION_CONSTRAINT_KEYS] as [
  (typeof ORCHESTRATION_CONSTRAINT_KEYS)[number],
  ...(typeof ORCHESTRATION_CONSTRAINT_KEYS)[number][],
];

const OrchestrationGraphEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  relation: z.enum(dependencyRelationTuple),
  weight: z.number().min(0).max(1),
});

const OrchestrationEvidenceTaxonomySchema = z.object({
  observed: z.number().int().nonnegative(),
  derived: z.number().int().nonnegative(),
  assumed: z.number().int().nonnegative(),
  missing: z.number().int().nonnegative(),
});

const OrchestrationGraphNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  domain: z.enum(initiativeDomainTuple),
  lane: z.enum(laneTuple),
  source: z.enum(graphNodeSourceTuple).optional(),
  analysis_depth: z.enum(graphNodeAnalysisDepthTuple).optional(),
  season_index: z.number().int().positive().optional(),
  time_bucket: z.enum(['now', 'next', 'later']).optional(),
  target_window_days: z.number().int().positive().optional(),
  priority_score: z.number().positive().optional(),
  evidence_taxonomy: OrchestrationEvidenceTaxonomySchema.optional(),
  /** Optional typed evidence handles (intake, url, collector, artifact) — may be empty when only counts exist. */
  evidence_refs: z.array(z.string().min(1)).optional(),
  /** Optional Delivery Board identity hint (from Strategy initiative when present). */
  board_identity_key: z.string().min(1).max(CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS).optional(),
});

const OrchestrationGraphPayloadSchema = z.object({
  nodes: z.array(OrchestrationGraphNodeSchema),
  edges: z.array(OrchestrationGraphEdgeSchema),
  meta: z
    .object({
      cycles_broken: z.number().int().nonnegative().optional(),
      dropped_edges: z.array(OrchestrationGraphEdgeSchema).optional(),
      priority_scores: z.record(z.string().min(1), z.number().positive()).optional(),
    })
    .optional(),
});

const ConflictResolvedSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  resolution: z.enum(orchestrationConflictResolutionTuple),
});

/** Lane id -> ordered node ids for timeline projection. */
const LanesIndexSchema = z.record(z.enum(laneTuple), z.array(z.string()));

const OrchestrationPhaseDiagnosticSchema = z.object({
  dominant_constraint: z.enum(constraintTuple),
  constraint_chain: z.array(z.enum(constraintTuple)).min(1),
});

const executionModeTuple = [...ORCHESTRATION_EXECUTION_MODES] as [
  (typeof ORCHESTRATION_EXECUTION_MODES)[number],
  ...(typeof ORCHESTRATION_EXECUTION_MODES)[number][],
];

const inputModeTuple = [...ORCHESTRATION_INPUT_MODES] as [
  (typeof ORCHESTRATION_INPUT_MODES)[number],
  ...(typeof ORCHESTRATION_INPUT_MODES)[number][],
];
const inputGateStatusTuple = [...ORCHESTRATION_INPUT_GATE_STATUSES] as [
  (typeof ORCHESTRATION_INPUT_GATE_STATUSES)[number],
  ...(typeof ORCHESTRATION_INPUT_GATE_STATUSES)[number][],
];

const fallbackReasonTuple = [...ORCHESTRATION_FALLBACK_REASON_CODES] as [
  (typeof ORCHESTRATION_FALLBACK_REASON_CODES)[number],
  ...(typeof ORCHESTRATION_FALLBACK_REASON_CODES)[number][],
];

const OrchestrationRoutingProfileSchema = z.object({
  strategy: z.literal('toc_dynamic_routing_v1'),
  domain_weights: z.record(z.enum(initiativeDomainTuple), z.number().min(0.5).max(2)),
});

const OrchestrationConfidenceMapSchema = z.object({
  node_confidence: z.record(z.string().min(1), z.enum(['high', 'medium', 'low'])),
  /** ADR v1.1: missing-data / unlock list for gating. */
  unlock_conditions: z.array(z.string().min(1)).optional(),
});

const OrchestrationRiskLayerSchema = z.object({
  node_risk: z.record(z.string().min(1), z.number().min(1).max(5)),
  /** Cross-domain risk edges (in addition to per-node `node_risk`). */
  cross_domain: z
    .array(
      z.object({
        domains: z.tuple([z.enum(initiativeDomainTuple), z.enum(initiativeDomainTuple)]),
        risk: z.number().min(1).max(5),
        note: z.string().optional(),
      }),
    )
    .optional(),
});

const OrchestrationDomainInfluenceSchema = z.object({
  domain_weights: z.record(z.enum(initiativeDomainTuple), z.number().min(0.5).max(2)),
});

const OrchestrationInputQualitySchema = z.object({
  input_mode: z.enum(inputModeTuple),
  input_gate_status: z.enum(inputGateStatusTuple),
  director_coverage_ratio: z.number().min(0).max(1),
  director_input_coverage_ratio: z.number().min(0).max(1),
  degraded: z.boolean(),
  fallback_reason_code: z.enum(fallbackReasonTuple).optional(),
});

const OrchestrationTopActionsSchema = z.object({
  top_actions_7d: z.array(z.string().min(1)),
  top_actions_30d: z.array(z.string().min(1)),
});

const OrchestrationDataGapsSchema = z.object({
  degraded_input: z.boolean(),
  fallback_reason_code: z.enum(fallbackReasonTuple).optional(),
  dangling_dependencies: z.number().int().nonnegative(),
  missing_confidence: z.number().int().nonnegative(),
  missing_risk: z.number().int().nonnegative(),
});

export const GlcOrchestrationPackSchemaV2 = z.object({
  version: z.literal(GLC_ORCHESTRATION_PACK_SCHEMA_VERSION),
  graph: OrchestrationGraphPayloadSchema,
  lanes: LanesIndexSchema,
  critical_path: z.array(z.string()),
  conflicts_resolved: z.array(ConflictResolvedSchema),
  manifest_snapshot_id: z.string().uuid(),
  phase_diagnostic: OrchestrationPhaseDiagnosticSchema,
  routing_profile: OrchestrationRoutingProfileSchema,
  execution_mode: z.enum(executionModeTuple).default('deterministic'),
  confidence_map: OrchestrationConfidenceMapSchema.default({ node_confidence: {} }),
  risk_layer: OrchestrationRiskLayerSchema.default({ node_risk: {} }),
  domain_influence: OrchestrationDomainInfluenceSchema.default({ domain_weights: {} }),
  input_quality: OrchestrationInputQualitySchema.default(ORCHESTRATION_DEFAULT_INPUT_QUALITY),
  /** v1 contract alias for phase_diagnostic. */
  system_diagnosis: OrchestrationPhaseDiagnosticSchema.optional(),
  /** v1 contract aliases for top_actions windows. */
  top_7d: z.array(z.string().min(1)).optional(),
  top_30d: z.array(z.string().min(1)).optional(),
  /** Aggregated data gaps for plan-level governance and UX warnings. */
  data_gaps: OrchestrationDataGapsSchema.optional(),
  top_actions: OrchestrationTopActionsSchema.optional(),
  /** True when pack build applied execution compression (ADR PHASE 7). */
  compressed_plan: z.boolean().optional(),
  /** North-star and measurement scaffolding (optional client surfaces). */
  metrics_framework: z
    .object({
      north_star: z.string().optional(),
      leading: z.array(z.string().min(1)).optional(),
      lagging: z.array(z.string().min(1)).optional(),
    })
    .optional(),
  /**
   * Plan-level control object (ADR V4) — optional; gated in UI by `FEATURE_PLAN_CONTROL_OBJECT`.
   */
  control_object: z
    .object({
      objective: z.string().min(1).max(2000),
      constraints: z.array(z.string().min(1)).max(50).optional(),
      exit_criteria: z.array(z.string().min(1)).max(50).optional(),
      escalation_rules: z.array(z.string().min(1)).max(50).optional(),
    })
    .optional(),
});

const GlcOrchestrationPackSchemaV1 = z.object({
  version: z.literal(1),
  graph: z.object({
    nodes: z.array(OrchestrationGraphNodeSchema),
    edges: z.array(
      z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        weight: z.number().min(0).max(1).default(1),
      }),
    ),
    meta: z
      .object({
        cycles_broken: z.number().int().nonnegative().optional(),
        dropped_edges: z
          .array(
            z.object({
              from: z.string().min(1),
              to: z.string().min(1),
              weight: z.number().min(0).max(1).default(1),
            }),
          )
          .optional(),
      })
      .optional(),
  }),
  lanes: LanesIndexSchema,
  critical_path: z.array(z.string()),
  conflicts_resolved: z.array(ConflictResolvedSchema),
  manifest_snapshot_id: z.string().uuid(),
});

export type GlcOrchestrationPack = z.infer<typeof GlcOrchestrationPackSchemaV2>;

function inferRelationAndWeight(input: { fromNodeDomain?: string; toNodeDomain?: string; sharedLane: boolean }): {
  relation: (typeof ORCHESTRATION_DEPENDENCY_RELATION_KINDS)[number];
  weight: number;
} {
  if (!input.fromNodeDomain || !input.toNodeDomain) {
    return { relation: 'medium', weight: ORCHESTRATION_DEPENDENCY_RELATION_WEIGHTS.medium };
  }
  if (input.fromNodeDomain === input.toNodeDomain) {
    return { relation: 'direct_blocker', weight: ORCHESTRATION_DEPENDENCY_RELATION_WEIGHTS.direct_blocker };
  }
  if (input.sharedLane) {
    return { relation: 'strong', weight: ORCHESTRATION_DEPENDENCY_RELATION_WEIGHTS.strong };
  }
  return { relation: 'weak', weight: ORCHESTRATION_DEPENDENCY_RELATION_WEIGHTS.weak };
}

function adaptGlcOrchestrationPackV1ToV2(raw: z.infer<typeof GlcOrchestrationPackSchemaV1>): GlcOrchestrationPack {
  const nodeById = new Map(raw.graph.nodes.map(node => [node.id, node] as const));
  const edges = raw.graph.edges.map(edge => {
    const fromNode = nodeById.get(edge.from);
    const toNode = nodeById.get(edge.to);
    const inferred = inferRelationAndWeight({
      fromNodeDomain: fromNode?.domain,
      toNodeDomain: toNode?.domain,
      sharedLane: fromNode?.lane !== undefined && fromNode?.lane === toNode?.lane,
    });
    return {
      from: edge.from,
      to: edge.to,
      relation: inferred.relation,
      weight: edge.weight ?? inferred.weight,
    };
  });
  return GlcOrchestrationPackSchemaV2.parse({
    ...raw,
    version: GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
    graph: {
      ...raw.graph,
      edges,
      meta: raw.graph.meta
        ? {
            ...raw.graph.meta,
            dropped_edges: raw.graph.meta.dropped_edges?.map(edge => {
              const fromNode = nodeById.get(edge.from);
              const toNode = nodeById.get(edge.to);
              const inferred = inferRelationAndWeight({
                fromNodeDomain: fromNode?.domain,
                toNodeDomain: toNode?.domain,
                sharedLane: fromNode?.lane !== undefined && fromNode?.lane === toNode?.lane,
              });
              return {
                from: edge.from,
                to: edge.to,
                relation: inferred.relation,
                weight: edge.weight ?? inferred.weight,
              };
            }),
          }
        : undefined,
    },
    phase_diagnostic: {
      dominant_constraint: 'capacity',
      constraint_chain: ['capacity'],
    },
    routing_profile: {
      strategy: 'toc_dynamic_routing_v1',
      domain_weights: {},
    },
    execution_mode: 'deterministic',
    confidence_map: { node_confidence: {} },
    risk_layer: { node_risk: {} },
    domain_influence: { domain_weights: {} },
    input_quality: ORCHESTRATION_DEFAULT_INPUT_QUALITY,
  });
}

export const GlcOrchestrationPackSchema = z.preprocess((value) => {
  const v2 = GlcOrchestrationPackSchemaV2.safeParse(value);
  if (v2.success) return v2.data;
  const v1 = GlcOrchestrationPackSchemaV1.safeParse(value);
  if (v1.success) return adaptGlcOrchestrationPackV1ToV2(v1.data);
  return value;
}, GlcOrchestrationPackSchemaV2);
