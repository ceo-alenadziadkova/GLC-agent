import { DOMAIN_KEYS } from '@glc/intake-core';
import { z } from 'zod';

import { ROADMAP_CHANGE_SCENARIOS, ROADMAP_SEASON_PRESETS } from '../config/orchestration-roadmap-presets.js';

const domainKeyEnum = [...DOMAIN_KEYS] as [string, ...string[]];

const changeScenarioEnum = [...ROADMAP_CHANGE_SCENARIOS] as [
  (typeof ROADMAP_CHANGE_SCENARIOS)[number],
  ...(typeof ROADMAP_CHANGE_SCENARIOS)[number][],
];

const seasonPresetEnum = [...ROADMAP_SEASON_PRESETS] as [
  (typeof ROADMAP_SEASON_PRESETS)[number],
  ...(typeof ROADMAP_SEASON_PRESETS)[number][],
];

export const RoadmapManifestPayloadSchema = z.object({
  /** Must align with `audits.execution_plan.selected_domains` (same set, order not significant). */
  selected_domains: z.array(z.enum(domainKeyEnum)).min(1),
  change_scenario: z.enum(changeScenarioEnum),
  season_preset: z.enum(seasonPresetEnum),
  priority_weights: z
    .object({
      speed_vs_risk: z.enum(['speed', 'balanced', 'risk_averse']).optional(),
    })
    .optional(),
});

export type RoadmapManifestPayload = z.infer<typeof RoadmapManifestPayloadSchema>;
