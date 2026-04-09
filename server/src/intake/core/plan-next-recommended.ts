/**
 * Heuristic next-step bank ids for adaptive UX (ADR Phase F).
 *
 * Ordering (within `visibleOrdered`):
 * 1. Unanswered `required` — SLA completion pressure.
 * 2. Unanswered `recommended` — editorial value.
 * 3. Unanswered `optional` that are primary-feed for a domain still in `missingForReport`
 *    — closes report/agent input gaps without treating optional as globally mandatory.
 */
import type { IntakeQuestionStub, IntakeResponsesMap } from '../types.js';
import { isPrimaryFeedForDomain } from '../question-feed-roles.js';
import { isIntakeAnswered } from '../unwrap.js';

import type { IntakePlanCoverageDomain } from './types.js';

const DEFAULT_MAX = 8;

export function computeNextRecommended(args: {
  visibleOrdered: string[];
  stubs: IntakeQuestionStub[];
  responses: IntakeResponsesMap;
  /** Domains with unanswered SLA-visible primary-feed questions; drives optional tier. */
  missingForReport?: readonly IntakePlanCoverageDomain[];
  max?: number;
}): string[] {
  const max = args.max ?? DEFAULT_MAX;
  const missing = new Set(args.missingForReport ?? []);
  const priorityById = new Map(args.stubs.map(s => [s.id, s.priority]));
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (id: string) => {
    if (seen.has(id) || out.length >= max) return;
    if (!isIntakeAnswered(args.responses[id])) {
      seen.add(id);
      out.push(id);
    }
  };

  for (const id of args.visibleOrdered) {
    if (priorityById.get(id) !== 'required') continue;
    push(id);
  }

  for (const id of args.visibleOrdered) {
    if (priorityById.get(id) !== 'recommended') continue;
    push(id);
  }

  if (missing.size > 0) {
    for (const id of args.visibleOrdered) {
      if (priorityById.get(id) !== 'optional') continue;
      let primaryHitsMissing = false;
      for (const d of missing) {
        if (isPrimaryFeedForDomain(id, d)) {
          primaryHitsMissing = true;
          break;
        }
      }
      if (!primaryHitsMissing) continue;
      push(id);
    }
  }

  return out;
}
