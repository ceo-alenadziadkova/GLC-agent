import { z } from 'zod';

import {
  ORCHESTRATION_GRAPH_NODE_ANALYSIS_DEPTHS,
  ORCHESTRATION_GRAPH_NODE_SOURCES,
} from '../config/orchestration-graph-policy.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';
import { STRATEGY_INITIATIVE_DOMAIN_KEYS } from '../config/strategy-initiative-policy.js';

export const OrchestrationActionNodeSchema = z.object({
  id: z.string().min(1).max(160),
  title: z.string().min(1).max(320),
  domain: z.enum(STRATEGY_INITIATIVE_DOMAIN_KEYS),
  lane: z.enum(ORCHESTRATION_LANE_IDS),
  dependencies: z.array(z.string().min(1).max(160)).max(32),
  weight: z.number().finite().min(0),
  source: z.enum(ORCHESTRATION_GRAPH_NODE_SOURCES).optional(),
  analysis_depth: z.enum(ORCHESTRATION_GRAPH_NODE_ANALYSIS_DEPTHS).optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
  impact_score: z.number().finite().min(0).max(5).optional(),
  effort_score: z.number().finite().min(0).max(5).optional(),
  risk_score: z.number().finite().min(0).max(5).optional(),
  blocking_factor: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  time_to_value: z.enum(['fast', 'medium', 'slow']).optional(),
  domain_weight: z.number().finite().min(0).optional(),
  priority_score: z.number().finite().optional(),
  season_index: z.number().int().min(1).max(3).optional(),
  time_bucket: z.enum(['now', 'next', 'later']).optional(),
  target_window_days: z.number().int().positive().max(366).optional(),
  evidence_taxonomy: z
    .object({
      observed: z.number().int().nonnegative(),
      derived: z.number().int().nonnegative(),
      assumed: z.number().int().nonnegative(),
      missing: z.number().int().nonnegative(),
    })
    .optional(),
});

export const OrchestrationActionNodeListSchema = z.array(OrchestrationActionNodeSchema);

export type OrchestrationActionNodeRuntime = z.infer<typeof OrchestrationActionNodeSchema>;
