import { DOMAIN_KEYS, type DomainKey } from '@glc/intake-core';
import { z } from 'zod';

import {
  ROADMAP_CHANGE_SCENARIOS,
  ROADMAP_MANIFEST_SCHEMA_VERSION,
  ROADMAP_PRIORITY_SPEED_RISK_PRESETS,
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

export const RoadmapManifestPayloadSchema = z.object({
  schema_version: z.literal(ROADMAP_MANIFEST_SCHEMA_VERSION).default(ROADMAP_MANIFEST_SCHEMA_VERSION),
  /** Must align with `audits.execution_plan.selected_domains` (same set, order not significant). */
  selected_domains: z.array(z.enum(domainKeyEnum)).min(1),
  change_scenario: z.enum(changeScenarioEnum),
  season_preset: z.enum(seasonPresetEnum),
  priority_weights: z
    .object({
      speed_vs_risk: z.enum(prioritySpeedVsRiskEnum).optional(),
    })
    .optional(),
});

export type RoadmapManifestPayload = z.infer<typeof RoadmapManifestPayloadSchema>;
