import { z } from 'zod';

import {
  DIRECTOR_ORCHESTRATION_MAX_CROSS_DOMAIN_REFS_PER_ACTION,
  DIRECTOR_ORCHESTRATION_MAX_ACTIONS_PER_WAVE,
  GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION,
} from '../config/director-orchestration-policy.js';

const evidenceBucketSchema = z.array(z.string().max(500)).max(24);

export const DirectorActionSchema = z.object({
  id: z.string().min(1).max(128),
  title: z.string().min(1).max(240),
  description: z.string().max(2500).optional(),
  impact: z.number().int().min(1).max(5),
  effort: z.number().int().min(1).max(5),
  risk: z.number().int().min(1).max(5),
  urgency: z.number().int().min(1).max(5),
  confidence: z.enum(['high', 'medium', 'low']),
  dependencies: z.array(z.string().min(1).max(128)).max(24).default([]),
  cross_domain_refs: z
    .array(
      z.string().trim().min(1).max(128).regex(
        /^(tech_infrastructure|security_compliance|seo_digital|ux_conversion|marketing_utp|automation_processes):H[1-9]\d*$|^CONF-[1-9]\d*$/,
        'cross_domain_refs must contain peer hypothesis ids or conflict ids.',
      ),
    )
    .max(DIRECTOR_ORCHESTRATION_MAX_CROSS_DOMAIN_REFS_PER_ACTION)
    .optional(),
  evidence: z
    .object({
      observed: evidenceBucketSchema.optional(),
      derived: evidenceBucketSchema.optional(),
      assumed: evidenceBucketSchema.optional(),
      missing: evidenceBucketSchema.optional(),
    })
    .optional(),
  /** Optional A/B/C solution framing (CDO and future directors). */
  solution_options: z.array(z.string().min(1).max(500)).max(3).optional(),
});

export type DirectorAction = z.infer<typeof DirectorActionSchema>;

export const DirectorWaveBundleSchema = z.object({
  zones: z.array(z.string().min(1).max(120)).max(20).optional(),
  bottlenecks: z.array(z.string().min(1).max(320)).max(20).optional(),
  risks: z.array(z.string().min(1).max(320)).max(20).optional(),
  actions: z.array(DirectorActionSchema).max(DIRECTOR_ORCHESTRATION_MAX_ACTIONS_PER_WAVE),
});

export type DirectorWaveBundle = z.infer<typeof DirectorWaveBundleSchema>;

/**
 * Persisted under `audit_domains.raw_data.glc_director_execution`.
 * Baseline and deep waves are stored separately so badges stay data-driven.
 */
export const GlcDirectorOrchestrationSliceSchema = z.object({
  schema_version: z.literal(GLC_DIRECTOR_ORCHESTRATION_SLICE_SCHEMA_VERSION),
  baseline: DirectorWaveBundleSchema.optional(),
  deep: DirectorWaveBundleSchema.optional(),
});

export type GlcDirectorOrchestrationSlice = z.infer<typeof GlcDirectorOrchestrationSliceSchema>;

/**
 * Strict-domain quality gate: a slice is "strict-ready" only when baseline exists with at least one action.
 */
export function isStrictReadyDirectorSlice(slice: GlcDirectorOrchestrationSlice | null | undefined): boolean {
  return Boolean(slice?.baseline && slice.baseline.actions.length > 0);
}
