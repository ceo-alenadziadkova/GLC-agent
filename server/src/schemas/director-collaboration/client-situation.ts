/**
 * ClientSituationSnapshot — Phase 0.5 output of the Collaborative Director Protocol.
 *
 * Persisted under `audit_client_situation` (one row per audit).
 *
 * Concept ADR: `docs/adrs/ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md`.
 * No business literals here — caps and vocabularies live in
 * `server/src/config/coalition-protocol-policy.ts`.
 */

import { z } from 'zod';

import { DOMAIN_KEYS } from '@glc/intake-core';
import {
  COALITION_CLIENT_SITUATION_SCHEMA_VERSION,
  COALITION_DOMINANT_CONSTRAINTS,
  COALITION_ENTITY_TYPES,
  COALITION_MATURITY_TIERS,
  COALITION_MAX_SNAPSHOT_ASSUMPTIONS,
  COALITION_MAX_SNAPSHOT_CLARIFYING_QUESTIONS,
  COALITION_STRATEGIC_MODES,
} from '../../config/coalition-protocol-policy.js';

// ---------------------------------------------------------------------------
// Reusable shared shapes
// ---------------------------------------------------------------------------

const Confidence = z.enum(['high', 'medium', 'low']);
const RiskLevel = z.enum(['low', 'medium', 'high']);
const Severity3 = z.enum(['critical', 'high', 'medium']);

const SnapshotEvidenceRefSchema = z
  .object({
    type: z.enum(['recon', 'intake', 'collected_data', 'consultant_note']),
    finding: z.string().trim().min(4).max(500),
    bank_id: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Sub-objects
// ---------------------------------------------------------------------------

const MaturitySchema = z
  .object({
    product_clarity: z.number().int().min(1).max(5),
    audience_clarity: z.number().int().min(1).max(5),
    positioning_strength: z.number().int().min(1).max(5),
    channel_readiness: z.number().int().min(1).max(5),
    resource_constraints: z.number().int().min(1).max(5),
    overall_tier: z.enum(COALITION_MATURITY_TIERS),
  })
  .strict();

const ResourceEnvelopeSchema = z
  .object({
    bandwidth: RiskLevel,
    risk_tolerance: RiskLevel,
    urgency: RiskLevel,
    confidence: Confidence,
  })
  .strict();

/**
 * Domain weights are a closed object — every GLC domain gets a number.
 * Validated bounds: 0.5..2.0 (matches policy constants).
 */
const DomainWeightsSchema = z
  .object(
    Object.fromEntries(
      DOMAIN_KEYS.map((d) => [d, z.number().min(0.5).max(2.0)]),
    ) as Record<(typeof DOMAIN_KEYS)[number], z.ZodNumber>,
  )
  .strict();

const SnapshotAssumptionSchema = z
  .object({
    id: z.string().trim().regex(/^A\d+$/, 'Snapshot assumption id must match /^A\\d+$/'),
    statement: z.string().trim().min(8).max(500),
    impact: RiskLevel,
    validation_method: z.string().trim().min(4).max(240),
    invalidates_if_wrong: z.array(z.string().trim().min(1).max(128)).max(20).default([]),
  })
  .strict();

const SnapshotClarifyingQuestionSchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    question: z.string().trim().min(8).max(500),
    severity: Severity3,
    blocking_phases: z.array(z.number().int().min(0).max(7)).max(8).default([]),
  })
  .strict();

// ---------------------------------------------------------------------------
// Main schema
// ---------------------------------------------------------------------------

export const ClientSituationSnapshotSchema = z
  .object({
    schema_version: z.literal(COALITION_CLIENT_SITUATION_SCHEMA_VERSION),
    audit_id: z.string().uuid(),
    generated_at: z.string().datetime(),

    entity_type: z.enum(COALITION_ENTITY_TYPES),
    maturity: MaturitySchema,

    dominant_constraint: z.enum(COALITION_DOMINANT_CONSTRAINTS),
    constraint_chain: z.array(z.string().trim().min(4).max(240)).max(5).default([]),

    resource_envelope: ResourceEnvelopeSchema,
    strategic_mode: z.enum(COALITION_STRATEGIC_MODES),
    domain_weights: DomainWeightsSchema,

    assumptions: z.array(SnapshotAssumptionSchema).max(COALITION_MAX_SNAPSHOT_ASSUMPTIONS).default([]),
    clarifying_questions: z
      .array(SnapshotClarifyingQuestionSchema)
      .max(COALITION_MAX_SNAPSHOT_CLARIFYING_QUESTIONS)
      .default([]),

    evidence_refs: z.array(SnapshotEvidenceRefSchema).min(1).max(20),
    data_quality_score: z.number().int().min(0).max(100),
    unknown_items: z.array(z.string().trim().min(2).max(240)).max(20).default([]),

    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict()
  .superRefine((value, ctx) => {
    // If snapshot confidence is 'low' on the resource envelope, at least one
    // assumption must be classified as high impact — forces honest signaling
    // for downstream gates instead of silent best-effort guesses.
    if (value.resource_envelope.confidence === 'low') {
      const highImpact = value.assumptions.some((a) => a.impact === 'high');
      if (!highImpact) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['assumptions'],
          message:
            'When resource_envelope.confidence is "low", at least one assumption must have impact="high".',
        });
      }
    }

    // Critical clarifying questions must have a non-empty blocking_phases set —
    // otherwise the Approve-Coalition gate cannot enforce them.
    for (const [i, q] of value.clarifying_questions.entries()) {
      if (q.severity === 'critical' && q.blocking_phases.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['clarifying_questions', i, 'blocking_phases'],
          message:
            'Critical clarifying questions must list blocking_phases (Approve-Coalition gate enforces them).',
        });
      }
    }

    // Evidence refs must include at least one source other than 'inferred-only';
    // i.e. at least one of {recon | intake | collected_data | consultant_note}
    // appears with a finding that is not just '(inferred)'. Implicit guard:
    // we already require min(1) and the type enum forbids 'inferred', so the
    // remaining failure mode is "all findings empty after trim", which the
    // `min(4)` on `finding` already prevents.
  });

export type ClientSituationSnapshot = z.infer<typeof ClientSituationSnapshotSchema>;
