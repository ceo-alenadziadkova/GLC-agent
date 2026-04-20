import { z } from 'zod';

import {
  ORCHESTRATION_CONSTRAINT_KEYS,
  GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
  ORCHESTRATION_DEPENDENCY_RELATION_KINDS,
  ORCHESTRATION_DEPENDENCY_RELATION_WEIGHTS,
  ORCHESTRATION_CONFLICT_RESOLUTIONS,
  ORCHESTRATION_EXECUTION_MODES,
  ORCHESTRATION_GRAPH_NODE_ANALYSIS_DEPTHS,
  ORCHESTRATION_GRAPH_NODE_SOURCES,
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

const OrchestrationRoutingProfileSchema = z.object({
  strategy: z.literal('toc_dynamic_routing_v1'),
  domain_weights: z.record(z.enum(initiativeDomainTuple), z.number().min(0.5).max(2)),
});

const OrchestrationConfidenceMapSchema = z.object({
  node_confidence: z.record(z.string().min(1), z.enum(['high', 'medium', 'low'])),
});

const OrchestrationRiskLayerSchema = z.object({
  node_risk: z.record(z.string().min(1), z.number().min(1).max(5)),
});

const OrchestrationDomainInfluenceSchema = z.object({
  domain_weights: z.record(z.enum(initiativeDomainTuple), z.number().min(0.5).max(2)),
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
  });
}

export const GlcOrchestrationPackSchema = z.preprocess((value) => {
  const v2 = GlcOrchestrationPackSchemaV2.safeParse(value);
  if (v2.success) return v2.data;
  const v1 = GlcOrchestrationPackSchemaV1.safeParse(value);
  if (v1.success) return adaptGlcOrchestrationPackV1ToV2(v1.data);
  return value;
}, GlcOrchestrationPackSchemaV2);
