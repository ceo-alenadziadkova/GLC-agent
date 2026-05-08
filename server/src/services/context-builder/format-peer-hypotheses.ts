import type { DomainKey } from '@glc/intake-core';

import { COALITION_MAX_HYPOTHESES_PER_DOMAIN } from '../../config/coalition-protocol-policy.js';

type CoalitionDraftRow = {
  domain_key?: unknown;
  draft?: unknown;
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

