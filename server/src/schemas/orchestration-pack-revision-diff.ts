import { z } from 'zod';

import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';
import { ORCHESTRATION_PACK_REVISION_DIFF_SCHEMA_VERSION } from '../config/orchestration-graph-policy.js';

const laneTuple = [...ORCHESTRATION_LANE_IDS] as [
  (typeof ORCHESTRATION_LANE_IDS)[number],
  ...(typeof ORCHESTRATION_LANE_IDS)[number][],
];

const EdgeRefSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
});

export const GlcOrchestrationPackRevisionDiffSchema = z.object({
  schema_version: z
    .literal(ORCHESTRATION_PACK_REVISION_DIFF_SCHEMA_VERSION)
    .default(ORCHESTRATION_PACK_REVISION_DIFF_SCHEMA_VERSION),
  from_version: z.number().int().nonnegative(),
  to_version: z.number().int().positive(),
  nodes_added: z.array(z.string()),
  nodes_removed: z.array(z.string()),
  nodes_lane_changed: z.array(
    z.object({
      id: z.string().min(1),
      from_lane: z.enum(laneTuple),
      to_lane: z.enum(laneTuple),
    }),
  ),
  edges_added: z.array(EdgeRefSchema),
  edges_removed: z.array(EdgeRefSchema),
  critical_path_changed: z.boolean(),
  execution_mode_changed: z.boolean().optional(),
  confidence_map_changed: z.boolean().optional(),
  risk_layer_changed: z.boolean().optional(),
  domain_influence_changed: z.boolean().optional(),
  conflicts_resolved_before: z.number().int().nonnegative(),
  conflicts_resolved_after: z.number().int().nonnegative(),
});

export type GlcOrchestrationPackRevisionDiff = z.infer<typeof GlcOrchestrationPackRevisionDiffSchema>;
