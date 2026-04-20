import { DOMAIN_KEYS, type DomainKey } from '@glc/intake-core';
import { z } from 'zod';
import { ROADMAP_CHANGE_SCENARIOS, ROADMAP_SEASON_PRESETS } from '../config/orchestration-roadmap-presets.js';
import { GlcOrchestrationPackRevisionDiffSchema } from './orchestration-pack-revision-diff.js';
import { OrchestrationPlanGovernanceSchema } from './orchestration-plan-governance.js';
import { RoadmapManifestPreviewSchema } from './roadmap-manifest-preview.js';

const domainKeyEnum = [...DOMAIN_KEYS] as [DomainKey, ...DomainKey[]];
const changeScenarioEnum = [...ROADMAP_CHANGE_SCENARIOS] as [
  (typeof ROADMAP_CHANGE_SCENARIOS)[number],
  ...(typeof ROADMAP_CHANGE_SCENARIOS)[number][],
];
const seasonPresetEnum = [...ROADMAP_SEASON_PRESETS] as [
  (typeof ROADMAP_SEASON_PRESETS)[number],
  ...(typeof ROADMAP_SEASON_PRESETS)[number][],
];

export const OrchestrationCommercialOfferRequestSchema = z.object({
  change_scenario: z.enum(changeScenarioEnum),
  season_preset: z.enum(seasonPresetEnum),
  selected_domains: z.array(z.enum(domainKeyEnum)).min(1),
  accept_domain: z.enum(domainKeyEnum).optional(),
});

export const OrchestrationCommercialOfferItemSchema = z.object({
  domain: z.enum(domainKeyEnum),
  value_message: z.string().min(1),
  estimated_incremental_effort_weeks: z.number().int().positive(),
});

export const OrchestrationCommercialOfferResponseSchema = z.object({
  offers: z.array(OrchestrationCommercialOfferItemSchema),
  accepted_domain: z.enum(domainKeyEnum).nullable(),
  base_preview: RoadmapManifestPreviewSchema,
  recalculated_preview: RoadmapManifestPreviewSchema.nullable(),
  accepted_pack_result: z
    .object({
      manifest_snapshot_id: z.string().uuid(),
      orchestration_pack_version: z.number().int().positive(),
      roadmap_version: z.number().int().positive(),
      last_revision_diff: GlcOrchestrationPackRevisionDiffSchema.nullable(),
      plan_governance: OrchestrationPlanGovernanceSchema,
    })
    .nullable(),
});

export type OrchestrationCommercialOfferRequest = z.infer<typeof OrchestrationCommercialOfferRequestSchema>;
export type OrchestrationCommercialOfferResponse = z.infer<typeof OrchestrationCommercialOfferResponseSchema>;
