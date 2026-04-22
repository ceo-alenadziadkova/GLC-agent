import { z } from 'zod';
import {
  ORCHESTRATION_DEPENDENCY_RELATION_KINDS,
  ORCHESTRATION_FALLBACK_REASON_CODES,
} from '../config/orchestration-graph-policy.js';
import {
  ORCHESTRATION_MANIFEST_STATES,
  ORCHESTRATION_TIMELINE_STATUSES,
} from '../config/orchestration-client-contract.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';
import { ROADMAP_SEASON_PRESETS } from '../config/orchestration-roadmap-presets.js';
import { STRATEGY_INITIATIVE_DOMAIN_KEYS } from '../config/strategy-initiative-policy.js';

const laneTuple = [...ORCHESTRATION_LANE_IDS] as [
  (typeof ORCHESTRATION_LANE_IDS)[number],
  ...(typeof ORCHESTRATION_LANE_IDS)[number][],
];

const domainTuple = [...STRATEGY_INITIATIVE_DOMAIN_KEYS] as [
  (typeof STRATEGY_INITIATIVE_DOMAIN_KEYS)[number],
  ...(typeof STRATEGY_INITIATIVE_DOMAIN_KEYS)[number][],
];

const relationTuple = [...ORCHESTRATION_DEPENDENCY_RELATION_KINDS] as [
  (typeof ORCHESTRATION_DEPENDENCY_RELATION_KINDS)[number],
  ...(typeof ORCHESTRATION_DEPENDENCY_RELATION_KINDS)[number][],
];

const fallbackReasonTuple = [...ORCHESTRATION_FALLBACK_REASON_CODES] as [
  (typeof ORCHESTRATION_FALLBACK_REASON_CODES)[number],
  ...(typeof ORCHESTRATION_FALLBACK_REASON_CODES)[number][],
];

const timelineStatusTuple = [...ORCHESTRATION_TIMELINE_STATUSES] as [
  (typeof ORCHESTRATION_TIMELINE_STATUSES)[number],
  ...(typeof ORCHESTRATION_TIMELINE_STATUSES)[number][],
];

const manifestStateTuple = [...ORCHESTRATION_MANIFEST_STATES] as [
  (typeof ORCHESTRATION_MANIFEST_STATES)[number],
  ...(typeof ORCHESTRATION_MANIFEST_STATES)[number][],
];

const roadmapSeasonPresetTuple = [...ROADMAP_SEASON_PRESETS] as [
  (typeof ROADMAP_SEASON_PRESETS)[number],
  ...(typeof ROADMAP_SEASON_PRESETS)[number][],
];

export const ClientTimelineStatusSchema = z.enum(timelineStatusTuple);

const TimelineNodeCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  domain: z.enum(domainTuple),
  lane: z.enum(laneTuple),
  season_index: z.number().int().positive().optional(),
  time_bucket: z.enum(['now', 'next', 'later']).optional(),
  analysis_depth: z.enum(['baseline', 'deep']).optional(),
  source: z.enum(['strategy', 'director']).optional(),
  explain: z
    .object({
      why: z.array(z.string().min(1)).optional(),
      how: z
        .object({
          path_type: z.string().min(1).optional(),
          description: z.string().min(1),
          time_estimate: z.string().min(1).optional(),
        })
        .optional(),
      impact: z
        .object({
          score: z.number().optional(),
          label: z.string().min(1).optional(),
        })
        .optional(),
      time: z
        .object({
          bucket: z.enum(['now', 'next', 'later']).optional(),
          target_window_days: z.number().int().positive().optional(),
          time_to_value: z.string().min(1).optional(),
        })
        .optional(),
      risks: z.array(z.string().min(1)).optional(),
      limited_context: z.boolean().optional(),
    })
    .optional(),
});

const TimelineLaneSchema = z.object({
  lane_id: z.enum(laneTuple),
  items: z.array(TimelineNodeCardSchema),
});

const TimelineDependencySchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  relation: z.enum(relationTuple),
  cross_lane: z.boolean(),
  blocking: z.boolean(),
});

const TimelineSeasonSchema = z.object({
  id: z.enum(['near', 'mid', 'far']),
  node_ids: z.array(z.string().min(1)),
});

const planHorizonIsoRegex = /^\d{4}-\d{2}-\d{2}$/;
const TimelinePlanHorizonSchema = z.object({
  start_date: z.string().regex(planHorizonIsoRegex),
  end_date: z.string().regex(planHorizonIsoRegex),
});

const TimelineVersionSchema = z.object({
  roadmap_version: z.number().int().nonnegative(),
  manifest_snapshot_id: z.string().uuid().nullable(),
  latest_manifest_snapshot_id: z.string().uuid().nullable(),
  stale_manifest: z.boolean(),
  manifest_state: z.enum(manifestStateTuple),
  /** Manifest planning window used for seasonal bucket weights; null when unknown. */
  season_preset: z.enum(roadmapSeasonPresetTuple).nullable().optional(),
  /** When the roadmap manifest includes `plan_horizon`, timeline buckets follow calendar partition policy. */
  plan_horizon: TimelinePlanHorizonSchema.nullable().optional(),
});

const TimelineDataGapsSchema = z.object({
  degraded_input: z.boolean(),
  fallback_reason_code: z.enum(fallbackReasonTuple).optional(),
  dangling_dependencies: z.number().int().nonnegative(),
  missing_confidence: z.number().int().nonnegative(),
  missing_risk: z.number().int().nonnegative(),
});

export const OrchestratorTimelineDtoSchema = z.object({
  status: ClientTimelineStatusSchema,
  version: TimelineVersionSchema,
  seasons: z.array(TimelineSeasonSchema),
  lanes: z.array(TimelineLaneSchema),
  dependencies: z.array(TimelineDependencySchema),
  top_7d: z.array(z.string().min(1)),
  top_30d: z.array(z.string().min(1)),
  waiting_list_domains: z.array(z.enum(domainTuple)),
  data_gaps: TimelineDataGapsSchema.nullable(),
});

export type OrchestratorTimelineDto = z.infer<typeof OrchestratorTimelineDtoSchema>;

