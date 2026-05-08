import type { DomainKey } from '@glc/intake-core';

import { COALITION_MAX_HYPOTHESES_PER_DOMAIN } from '../../config/coalition-protocol-policy.js';

type CoalitionDraftRow = {
  domain_key?: unknown;
  draft?: unknown;
};

type CoalitionAlignmentRow = {
  domain_key?: unknown;
  alignment?: unknown;
};

function readHypotheses(draft: unknown): unknown[] {
  if (!draft || typeof draft !== 'object') return [];
  const hypotheses = (draft as { hypotheses?: unknown }).hypotheses;
  return Array.isArray(hypotheses) ? hypotheses : [];
}

/**
 * Render only peer hypotheses for the alignment phase. The cap comes from the
 * coalition policy module so prompt size stays bounded without local literals.
 */
export function formatPeerHypothesesForPrompt(
  rows: readonly CoalitionDraftRow[] | undefined,
  currentDomain: DomainKey,
): Array<Record<string, unknown>> {
  return (rows ?? [])
    .filter((row) => row.domain_key !== currentDomain)
    .map((row) => ({
      domain_key: row.domain_key,
      hypotheses: readHypotheses(row.draft).slice(0, COALITION_MAX_HYPOTHESES_PER_DOMAIN),
    }))
    .filter((row) => row.hypotheses.length > 0);
}

function readSelfCorrections(alignment: unknown): Array<Record<string, unknown>> {
  if (!alignment || typeof alignment !== 'object') return [];
  const selfCorrections = (alignment as { self_corrections?: unknown }).self_corrections;
  return Array.isArray(selfCorrections)
    ? selfCorrections.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];
}

function applySelfCorrections(
  hypotheses: unknown[],
  corrections: readonly Record<string, unknown>[],
): Array<Record<string, unknown>> {
  const correctionsById = new Map<string, Record<string, unknown>>();
  for (const correction of corrections) {
    if (typeof correction.hypothesis_id === 'string') {
      correctionsById.set(correction.hypothesis_id, correction);
    }
  }

  return hypotheses
    .filter((hypothesis): hypothesis is Record<string, unknown> => Boolean(hypothesis) && typeof hypothesis === 'object')
    .flatMap((hypothesis) => {
      const id = typeof hypothesis.id === 'string' ? hypothesis.id : '';
      const correction = correctionsById.get(id);
      if (!correction) return [hypothesis];
      if (correction.change === 'drop') return [];

      const next = { ...hypothesis };
      if (typeof correction.new_text === 'string') {
        next.statement = correction.new_text;
      }
      if (typeof correction.new_confidence === 'string') {
        next.confidence = correction.new_confidence;
      }
      next.alignment_self_correction = {
        change: correction.change,
        reason: correction.reason,
      };
      return [next];
    });
}

/**
 * Finalize receives the post-alignment view of peer hypotheses: each domain's
 * own self_corrections are applied before the final domain prompt sees them.
 */
export function formatAlignmentCorrectedPeerDraftsForPrompt(
  drafts: readonly CoalitionDraftRow[] | undefined,
  alignments: readonly CoalitionAlignmentRow[] | undefined,
): Array<Record<string, unknown>> {
  const alignmentsByDomain = new Map<unknown, unknown>();
  for (const row of alignments ?? []) {
    alignmentsByDomain.set(row.domain_key, row.alignment);
  }

  return (drafts ?? [])
    .map((row) => {
      const hypotheses = readHypotheses(row.draft).slice(0, COALITION_MAX_HYPOTHESES_PER_DOMAIN);
      const selfCorrections = readSelfCorrections(alignmentsByDomain.get(row.domain_key));
      return {
        domain_key: row.domain_key,
        hypotheses: applySelfCorrections(hypotheses, selfCorrections),
        self_corrections_applied: selfCorrections.length,
      };
    })
    .filter((row) => row.hypotheses.length > 0);
}

