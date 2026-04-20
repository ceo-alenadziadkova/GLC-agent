import { DOMAIN_KEYS, type DomainKey } from '@glc/intake-core';
import { z } from 'zod';

import {
  ROADMAP_CHANGE_SCENARIOS,
  ROADMAP_MANIFEST_SCHEMA_VERSION,
  ROADMAP_PRIORITY_SPEED_RISK_PRESETS,
  ROADMAP_RISK_TOLERANCE_PRESETS,
  ROADMAP_SEASON_PRESETS,
} from '../config/orchestration-roadmap-presets.js';

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
  /** v1 legacy snapshots remain readable; v2 is the current write version. */
  schema_version: z.union([z.literal(1), z.literal(2)]).default(ROADMAP_MANIFEST_SCHEMA_VERSION),
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
});

export type RoadmapManifestPayload = z.infer<typeof RoadmapManifestPayloadSchema>;
/** Contract-first alias used by orchestrator API surface. */
export const RoadmapInputManifestSchema = RoadmapManifestPayloadSchema;
export type RoadmapInputManifest = RoadmapManifestPayload;
