/**
 * DomainAlignmentResponse — Phase 2 output of the Collaborative Director Protocol.
 *
 * Persisted under `audit_domain_alignments` (one row per (audit_id, domain_key)).
 * Reads peer Phase-1 hypotheses, classifies relations, and self-corrects own draft.
 *
 * Concept ADR: `docs/adrs/ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md`.
 * No business literals here — caps and vocabularies live in
 * `server/src/config/coalition-protocol-policy.ts`.
 */

import { z } from 'zod';

import { DOMAIN_KEYS } from '@glc/intake-core';
import {
  COALITION_ALIGNMENT_SCHEMA_VERSION,
  COALITION_MAX_REACTIONS_PER_PEER,
  COALITION_MAX_SELF_CORRECTIONS_PER_DOMAIN,
  COALITION_MAX_TOTAL_REACTIONS_PER_DOMAIN,
  COALITION_REACTION_RELATIONS,
  COALITION_SELF_CORRECTION_KINDS,
} from '../../config/coalition-protocol-policy.js';
import { HYPOTHESIS_ID_PATTERN } from './hypothesis.js';

const Confidence = z.enum(['high', 'medium', 'low']);
const DomainKeyEnum = z.enum(DOMAIN_KEYS);

const HypothesisIdString = z
  .string()
  .trim()
  .regex(HYPOTHESIS_ID_PATTERN, 'Hypothesis id must match `<domain_key>:H<positive_int>`');

const CounterProposalSchema = z
  .object({
    replaces: HypothesisIdString,
    reformulation: z.string().trim().min(12).max(500),
    why: z.string().trim().min(12).max(500),
  })
  .strict();

const CrossDomainReactionSchema = z
  .object({
    target_hypothesis_id: HypothesisIdString,
    relation: z.enum(COALITION_REACTION_RELATIONS),
    rationale: z.string().trim().min(12).max(800),
    counter_proposal: CounterProposalSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    // counter_proposal only makes sense when the relation suggests reformulation:
    // 'contradicts', 'duplicates', or 'blocks'. For 'acknowledges' / 'enables' /
    // 'depends_on' a counter is structurally unjustified.
    if (
      value.counter_proposal &&
      !['contradicts', 'duplicates', 'blocks'].includes(value.relation)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['counter_proposal'],
        message:
          'counter_proposal is only allowed when relation is one of: contradicts, duplicates, blocks.',
      });
    }

    // counter_proposal.replaces must reference the same target hypothesis.
    if (value.counter_proposal && value.counter_proposal.replaces !== value.target_hypothesis_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['counter_proposal', 'replaces'],
        message:
          'counter_proposal.replaces must equal target_hypothesis_id (counter is scoped to one peer hypothesis).',
      });
    }
  });

const SelfCorrectionSchema = z
  .object({
    hypothesis_id: HypothesisIdString,
    change: z.enum(COALITION_SELF_CORRECTION_KINDS),
    new_text: z.string().trim().min(12).max(500).optional(),
    new_confidence: Confidence.optional(),
    reason: z.string().trim().min(12).max(800),
  })
  .strict()
  .superRefine((value, ctx) => {
    // 'reformulate' and 'split' both imply rewritten text — require new_text.
    if ((value.change === 'reformulate' || value.change === 'split') && !value.new_text) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['new_text'],
        message: `change="${value.change}" requires new_text.`,
      });
    }
    // 'lower_confidence' must include a strictly lower new_confidence — caller
    // can't know prior level here, but providing the field is the contract.
    if (value.change === 'lower_confidence' && !value.new_confidence) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['new_confidence'],
        message: 'change="lower_confidence" requires new_confidence.',
      });
    }
    // 'drop' should not carry text — it removes the hypothesis.
    if (value.change === 'drop' && (value.new_text || value.new_confidence)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['change'],
        message: 'change="drop" must not include new_text or new_confidence.',
      });
    }
  });

export const DomainAlignmentResponseSchema = z
  .object({
    schema_version: z.literal(COALITION_ALIGNMENT_SCHEMA_VERSION),
    audit_id: z.string().uuid(),
    domain_key: DomainKeyEnum,

    cross_domain_reactions: z
      .array(CrossDomainReactionSchema)
      .max(COALITION_MAX_TOTAL_REACTIONS_PER_DOMAIN)
      .default([]),

    self_corrections: z
      .array(SelfCorrectionSchema)
      .max(COALITION_MAX_SELF_CORRECTIONS_PER_DOMAIN)
      .default([]),

    analysis_mode: z
      .enum(['researched', 'deterministic_fallback', 'collaboration_degraded'])
      .default('researched'),
  })
  .strict()
  .superRefine((value, ctx) => {
    // A director may not react to its own hypotheses — those go into self_corrections.
    for (const [i, r] of value.cross_domain_reactions.entries()) {
      const peerDomain = r.target_hypothesis_id.split(':', 1)[0];
      if (peerDomain === value.domain_key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cross_domain_reactions', i, 'target_hypothesis_id'],
          message:
            'cross_domain_reactions cannot target this director\'s own hypothesis. Use self_corrections instead.',
        });
      }
    }

    // Per-peer reaction cap.
    const perPeer = new Map<string, number>();
    for (const r of value.cross_domain_reactions) {
      const peer = r.target_hypothesis_id.split(':', 1)[0];
      perPeer.set(peer, (perPeer.get(peer) ?? 0) + 1);
    }
    for (const [peer, count] of perPeer.entries()) {
      if (count > COALITION_MAX_REACTIONS_PER_PEER) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cross_domain_reactions'],
          message: `More than ${COALITION_MAX_REACTIONS_PER_PEER} reactions targeting peer "${peer}".`,
        });
      }
    }

    // Self-correction ids must be in our own domain.
    for (const [i, sc] of value.self_corrections.entries()) {
      const prefix = sc.hypothesis_id.split(':', 1)[0];
      if (prefix !== value.domain_key) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['self_corrections', i, 'hypothesis_id'],
          message: `self_corrections.hypothesis_id prefix "${prefix}" must match domain_key "${value.domain_key}".`,
        });
      }
    }
  });

export type DomainAlignmentResponse = z.infer<typeof DomainAlignmentResponseSchema>;
