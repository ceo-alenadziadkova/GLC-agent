/**
 * DomainHypothesisDraft — Phase 1 output of the Collaborative Director Protocol.
 *
 * Persisted under `audit_domain_hypotheses` (one row per (audit_id, domain_key)).
 *
 * Concept ADR: `docs/adrs/ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md`.
 * No business literals here — caps and vocabularies live in
 * `server/src/config/coalition-protocol-policy.ts`.
 */

import { z } from 'zod';

import { DOMAIN_KEYS } from '@glc/intake-core';
import { EvidenceRefSchema } from '../domain-output.js';
import {
  COALITION_HYPOTHESIS_SCHEMA_VERSION,
  COALITION_HYPOTHESIS_TYPES,
  COALITION_MAX_EVIDENCE_REFS_PER_HYPOTHESIS,
  COALITION_MAX_HYPOTHESES_PER_DOMAIN,
  COALITION_MAX_RAISED_QUESTIONS_PER_DOMAIN,
  COALITION_MIN_HYPOTHESES_PER_DOMAIN,
} from '../../config/coalition-protocol-policy.js';

const Confidence = z.enum(['high', 'medium', 'low']);
const DataSource = z.enum(['auto_detected', 'from_brief', 'inferred']);
const DomainKeyEnum = z.enum(DOMAIN_KEYS);

/**
 * Hypothesis id format: `<domain>:H<n>` where domain is one of the GLC domain
 * keys and n is 1-based. Validated by the Phase-2 alignment schema as well — keep
 * regex consistent across files.
 */
export const HYPOTHESIS_ID_PATTERN =
  /^(tech_infrastructure|security_compliance|seo_digital|ux_conversion|marketing_utp|automation_processes):H[1-9]\d*$/;

const HypothesisIdString = z
  .string()
  .trim()
  .regex(HYPOTHESIS_ID_PATTERN, 'Hypothesis id must match `<domain_key>:H<positive_int>`');

const AcknowledgedSituationSchema = z
  .object({
    snapshot_id: z.string().uuid(),
    domain_mode_mapping: z.string().trim().min(8).max(500),
  })
  .strict();

const HypothesisItemSchema = z
  .object({
    id: HypothesisIdString,
    type: z.enum(COALITION_HYPOTHESIS_TYPES),
    statement: z.string().trim().min(12).max(500),
    rationale: z.string().trim().min(20).max(1500),
    confidence: Confidence,
    evidence_refs: z
      .array(EvidenceRefSchema)
      .min(1)
      .max(COALITION_MAX_EVIDENCE_REFS_PER_HYPOTHESIS),
    data_source: DataSource,

    expected_business_outcomes: z.array(z.string().trim().min(8).max(240)).min(1).max(5),
    expected_costs: z.array(z.string().trim().min(4).max(240)).max(5).default([]),
    expected_dependencies_hints: z.array(z.string().trim().min(4).max(240)).max(8).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.confidence === 'high' && value.data_source === 'inferred') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confidence'],
        message:
          'A hypothesis with data_source="inferred" cannot claim confidence="high". Use medium or below.',
      });
    }
  });

const RaisedQuestionSchema = z
  .object({
    question: z.string().trim().min(8).max(500),
    severity: z.enum(['critical', 'high', 'medium']),
    asked_to: z.enum(['client', 'consultant']).default('client'),
  })
  .strict();

export const DomainHypothesisDraftSchema = z
  .object({
    schema_version: z.literal(COALITION_HYPOTHESIS_SCHEMA_VERSION),
    audit_id: z.string().uuid(),
    domain_key: DomainKeyEnum,

    acknowledged_situation: AcknowledgedSituationSchema,

    hypotheses: z
      .array(HypothesisItemSchema)
      .min(COALITION_MIN_HYPOTHESES_PER_DOMAIN)
      .max(COALITION_MAX_HYPOTHESES_PER_DOMAIN),

    raised_questions: z
      .array(RaisedQuestionSchema)
      .max(COALITION_MAX_RAISED_QUESTIONS_PER_DOMAIN)
      .default([]),

    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict()
  .superRefine((value, ctx) => {
    // Hypothesis ids must be unique within the draft.
    const seen = new Set<string>();
    for (const [i, h] of value.hypotheses.entries()) {
      if (seen.has(h.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['hypotheses', i, 'id'],
          message: `Duplicate hypothesis id "${h.id}" in draft.`,
        });
      }
      seen.add(h.id);
    }

    // Hypothesis id domain prefix must match the draft's domain_key.
    for (const [i, h] of value.hypotheses.entries()) {
      const prefix = h.id.split(':', 1)[0];
      if (prefix !== value.domain_key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['hypotheses', i, 'id'],
          message: `Hypothesis id prefix "${prefix}" does not match draft domain_key "${value.domain_key}".`,
        });
      }
    }
  });

export type DomainHypothesisDraft = z.infer<typeof DomainHypothesisDraftSchema>;
