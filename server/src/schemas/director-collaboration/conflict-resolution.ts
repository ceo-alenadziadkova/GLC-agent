/**
 * CrossDomainConflictResolution — Phase 3 output of the Collaborative Director
 * Protocol. Single resolver call (V1). Iterative variant deferred to V2+.
 *
 * Persisted under `audit_conflict_resolutions` (one row per audit).
 *
 * Concept ADR: `docs/adrs/ADR-CROSS-DIRECTOR-COLLABORATIVE-STRATEGY-V1.md`.
 * No business literals here — caps and vocabularies live in
 * `server/src/config/coalition-protocol-policy.ts`.
 */

import { z } from 'zod';

import { DOMAIN_KEYS } from '@glc/intake-core';
import {
  COALITION_ACTION_CONSTRAINTS,
  COALITION_CONFLICT_RESOLUTION_SCHEMA_VERSION,
  COALITION_CONFLICT_TYPES,
  COALITION_MAX_RESOLVED_CONFLICTS,
  COALITION_MAX_UNRESOLVED_CONFLICTS,
  COALITION_RESOLUTION_KINDS,
  COALITION_UNRESOLVED_RECOMMENDED_ACTIONS,
} from '../../config/coalition-protocol-policy.js';
import { HYPOTHESIS_ID_PATTERN } from './hypothesis.js';

const DomainKeyEnum = z.enum(DOMAIN_KEYS);

const HypothesisIdString = z
  .string()
  .trim()
  .regex(HYPOTHESIS_ID_PATTERN, 'Hypothesis id must match `<domain_key>:H<positive_int>`');

const ConflictIdString = z
  .string()
  .trim()
  .regex(/^CONF-[1-9]\d*$/, 'Conflict id must match /^CONF-[1-9]\\d*$/');

const AffectsActionSchema = z
  .object({
    domain_key: DomainKeyEnum,
    action_constraint: z.enum(COALITION_ACTION_CONSTRAINTS),
    paired_with: z.string().trim().min(1).max(128).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    // Constraints that talk about ordering or pairing require a paired peer.
    if (
      ['must_precede', 'must_follow', 'merged_with'].includes(value.action_constraint) &&
      !value.paired_with
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paired_with'],
        message: `action_constraint="${value.action_constraint}" requires paired_with.`,
      });
    }
  });

const ResolvedConflictSchema = z
  .object({
    id: ConflictIdString,
    type: z.enum(COALITION_CONFLICT_TYPES),
    parties: z.array(HypothesisIdString).min(2).max(8),
    resolution: z.enum(COALITION_RESOLUTION_KINDS),
    decision: z.string().trim().min(20).max(2000),
    tradeoffs_accepted: z.array(z.string().trim().min(8).max(500)).max(8).default([]),
    affects_actions: z.array(AffectsActionSchema).max(12).default([]),
  })
  .strict()
  .superRefine((value, ctx) => {
    // The two parties must come from at least two distinct domains for cross-domain
    // conflicts to be meaningful (a conflict inside one domain is a domain-internal
    // self_correction job).
    const domains = new Set(value.parties.map((p) => p.split(':', 1)[0]));
    if (domains.size < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parties'],
        message: 'Cross-domain conflict requires parties from at least 2 distinct domains.',
      });
    }

    // 'escalated_to_consultant' must NOT live under resolved_conflicts — it
    // belongs in `unresolved` (caller intent: human triage required).
    if (value.resolution === 'escalated_to_consultant') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['resolution'],
        message:
          'resolution="escalated_to_consultant" must be encoded as an unresolved entry, not under resolved_conflicts.',
      });
    }
  });

const UnresolvedConflictSchema = z
  .object({
    id: ConflictIdString,
    parties: z.array(HypothesisIdString).min(2).max(8),
    reason: z.string().trim().min(20).max(2000),
    recommended_action: z.enum(COALITION_UNRESOLVED_RECOMMENDED_ACTIONS),
  })
  .strict();

export const CrossDomainConflictResolutionSchema = z
  .object({
    schema_version: z.literal(COALITION_CONFLICT_RESOLUTION_SCHEMA_VERSION),
    audit_id: z.string().uuid(),

    resolved_conflicts: z.array(ResolvedConflictSchema).max(COALITION_MAX_RESOLVED_CONFLICTS).default([]),
    unresolved: z.array(UnresolvedConflictSchema).max(COALITION_MAX_UNRESOLVED_CONFLICTS).default([]),

    analysis_mode: z.enum(['researched', 'deterministic_fallback']).default('researched'),
  })
  .strict()
  .superRefine((value, ctx) => {
    // Conflict ids must be unique across both buckets.
    const seen = new Set<string>();
    const duplicateMessage = (id: string) => `Duplicate conflict id "${id}".`;

    for (const [i, c] of value.resolved_conflicts.entries()) {
      if (seen.has(c.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['resolved_conflicts', i, 'id'],
          message: duplicateMessage(c.id),
        });
      }
      seen.add(c.id);
    }
    for (const [i, c] of value.unresolved.entries()) {
      if (seen.has(c.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['unresolved', i, 'id'],
          message: duplicateMessage(c.id),
        });
      }
      seen.add(c.id);
    }

    // affects_actions.paired_with cannot reference an unknown party hypothesis
    // outside the parties list of the same conflict (best-effort consistency check).
    for (const [i, c] of value.resolved_conflicts.entries()) {
      const partySet = new Set(c.parties);
      for (const [j, a] of c.affects_actions.entries()) {
        if (a.paired_with && !partySet.has(a.paired_with)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['resolved_conflicts', i, 'affects_actions', j, 'paired_with'],
            message:
              'paired_with must reference a hypothesis listed in this conflict\'s parties.',
          });
        }
      }
    }
  });

export type CrossDomainConflictResolution = z.infer<typeof CrossDomainConflictResolutionSchema>;
