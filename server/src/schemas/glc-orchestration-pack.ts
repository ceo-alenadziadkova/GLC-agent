import { z } from 'zod';

import {
  GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
  ORCHESTRATION_CONFLICT_RESOLUTIONS,
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

const OrchestrationGraphEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  weight: z.number().min(0).max(1).default(1),
});

const OrchestrationGraphNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  domain: z.enum(initiativeDomainTuple),
  lane: z.enum(laneTuple),
});

const OrchestrationGraphPayloadSchema = z.object({
  nodes: z.array(OrchestrationGraphNodeSchema),
  edges: z.array(OrchestrationGraphEdgeSchema),
  meta: z
    .object({
      cycles_broken: z.number().int().nonnegative().optional(),
      dropped_edges: z.array(OrchestrationGraphEdgeSchema).optional(),
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

export const GlcOrchestrationPackSchema = z.object({
  version: z.literal(GLC_ORCHESTRATION_PACK_SCHEMA_VERSION),
  graph: OrchestrationGraphPayloadSchema,
  lanes: LanesIndexSchema,
  critical_path: z.array(z.string()),
  conflicts_resolved: z.array(ConflictResolvedSchema),
  manifest_snapshot_id: z.string().uuid(),
});

export type GlcOrchestrationPack = z.infer<typeof GlcOrchestrationPackSchema>;
