import { DOMAIN_KEYS, type DomainKey } from '@glc/intake-core';
import { z } from 'zod';

import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';
import {
  MANIFEST_DRAFT_REVISION_MAX_KEYS_PER_AUDIT,
  MANIFEST_DRAFT_REVISION_OWNER_HINT_MAX_CHARS,
} from '../config/orchestration-manifest-draft-policy.js';
import {
  ROADMAP_CHANGE_SCENARIOS,
  ROADMAP_MANIFEST_SCHEMA_VERSION,
  ROADMAP_PRIORITY_SPEED_RISK_PRESETS,
  ROADMAP_RISK_TOLERANCE_PRESETS,
  ROADMAP_SEASON_PRESETS,
} from '../config/orchestration-roadmap-presets.js';

const laneTupleHints = [...ORCHESTRATION_LANE_IDS] as [
  (typeof ORCHESTRATION_LANE_IDS)[number],
  ...(typeof ORCHESTRATION_LANE_IDS)[number][],
];

const NodeExecutionHintEntrySchema = z
  .object({
    lane: z.enum(laneTupleHints).optional(),
    owner_hint: z
      .union([
        z.string().trim().min(1).max(MANIFEST_DRAFT_REVISION_OWNER_HINT_MAX_CHARS),
        z.null(),
      ])
      .optional(),
  })
  .refine(
    row => row.lane != null || (typeof row.owner_hint === 'string' && row.owner_hint.length > 0),
    'entry must set lane or a non-empty owner_hint',
  );

const domainKeyEnum = [...DOMAIN_KEYS] as [DomainKey, ...DomainKey[]];

const changeScenarioEnum = [...ROADMAP_CHANGE_SCENARIOS] as [
  (typeof ROADMAP_CHANGE_SCENARIOS)[number],
  ...(typeof ROADMAP_CHANGE_SCENARIOS)[number][],
];

const seasonPresetEnum = [...ROADMAP_SEASON_PRESETS] as [
  (typeof ROADMAP_SEASON_PRESETS)[number],
  ...(typeof ROADMAP_SEASON_PRESETS)[number][],
];

const prioritySpeedVsRiskEnum = [...ROADMAP_PRIORITY_SPEED_RISK_PRESETS] as [
  (typeof ROADMAP_PRIORITY_SPEED_RISK_PRESETS)[number],
  ...(typeof ROADMAP_PRIORITY_SPEED_RISK_PRESETS)[number][],
];
const riskToleranceEnum = [...ROADMAP_RISK_TOLERANCE_PRESETS] as [
  (typeof ROADMAP_RISK_TOLERANCE_PRESETS)[number],
  ...(typeof ROADMAP_RISK_TOLERANCE_PRESETS)[number][],
];

/** ISO-8601 calendar date only (UTC semantics in partition policy). */
const roadmapIsoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const RoadmapPlanHorizonSchema = z
  .object({
    start_date: z.string().regex(roadmapIsoDateRegex),
    end_date: z.string().regex(roadmapIsoDateRegex),
  })
  .refine((h) => h.start_date <= h.end_date, {
    message: 'plan_horizon.end_date must be on or after start_date',
  });

export type RoadmapPlanHorizon = z.infer<typeof RoadmapPlanHorizonSchema>;

export const RoadmapManifestPayloadSchema = z.object({
  /** v1 legacy snapshots remain readable; v3 adds optional `node_execution_hints`. */
  schema_version: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(ROADMAP_MANIFEST_SCHEMA_VERSION),
  /** Must align with `audits.execution_plan.selected_domains` (same set, order not significant). */
  selected_domains: z.array(z.enum(domainKeyEnum)).min(1),
  change_scenario: z.enum(changeScenarioEnum),
  season_preset: z.enum(seasonPresetEnum),
  risk_tolerance: z.enum(riskToleranceEnum).optional(),
  priority_weights: z
    .object({
      speed_vs_risk: z.enum(prioritySpeedVsRiskEnum).optional(),
    })
    .optional(),
  /**
   * Optional calendar plan window. When set (valid dates), timeline seasonal buckets partition the critical path
   * by cumulative `target_window_days` (fallback: even slice of the inclusive day span) against calendar cuts
   * derived from `season_preset` weights — see `partitionCriticalPathIntoCalendarSeasonBuckets`.
   */
  plan_horizon: RoadmapPlanHorizonSchema.optional(),
  /** Optional client intent used as a soft prioritization hint during run/regenerate. */
  selected_action_ids: z.array(z.string().min(1)).max(50).optional(),
  /**
   * v3: deterministic execution overrides keyed by canonical_node_key (`cnk_v1_*`), merged when saving manifest snapshot.
   */
  node_execution_hints: z
    .record(
      z
        .string()
        .min(1)
        .max(120),
      NodeExecutionHintEntrySchema,
    )
    .optional(),
}).superRefine((row, ctx) => {
  const hints = row.node_execution_hints;
  if (!hints) return;
  const n = Object.keys(hints).length;
  if (n > MANIFEST_DRAFT_REVISION_MAX_KEYS_PER_AUDIT) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `node_execution_hints supports at most ${MANIFEST_DRAFT_REVISION_MAX_KEYS_PER_AUDIT} canonical keys`,
    });
  }
});

export type RoadmapManifestPayload = z.infer<typeof RoadmapManifestPayloadSchema>;
/** Contract-first alias used by orchestrator API surface. */
export const RoadmapInputManifestSchema = RoadmapManifestPayloadSchema;
export type RoadmapInputManifest = RoadmapManifestPayload;
