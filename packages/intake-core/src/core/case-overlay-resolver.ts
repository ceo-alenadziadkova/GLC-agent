import { isIntakeAnswered } from '../unwrap.js';
import type { IntakeCasePatternV1 } from './case-pattern-types.js';
import { countAnsweredInSet, evaluateCaseStopCondition } from './case-matcher.js';

export type CaseOverlayResolution = {
  matchedCaseKeys: string[];
  overlayQuestionIds: string[];
  stopConditionMetByCase: Record<string, boolean>;
};

/**
 * Merges overlay bank ids from all matching cases (stable order: first match wins for position, then dedupe).
 */
export function resolveCaseOverlay(args: {
  matches: IntakeCasePatternV1[];
  confidenceByKey: Record<string, import('../audit-contract.js').IntakeCriticalSignalConfidence>;
}): CaseOverlayResolution {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const stopConditionMetByCase: Record<string, boolean> = {};
  for (const m of args.matches) {
    stopConditionMetByCase[m.caseKey] = evaluateCaseStopCondition(m, args.confidenceByKey);
    for (const id of m.overlayQuestionIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      ordered.push(id);
    }
  }
  return {
    matchedCaseKeys: args.matches.map(m => m.caseKey),
    overlayQuestionIds: ordered,
    stopConditionMetByCase,
  };
}

/**
 * Prepends unanswered overlay ids (visible) ahead of the existing nextRecommended order.
 * Overlay may surface questions that were not yet in nextRecommended (e.g. optional tier).
 */
export function mergeOverlayIntoNextRecommended(args: {
  nextRecommended: string[];
  overlayQuestionIds: string[];
  visibleOrEligible: Set<string>;
  responses: Record<string, unknown>;
}): string[] {
  const out: string[] = [];
  for (const id of args.overlayQuestionIds) {
    if (!args.visibleOrEligible.has(id)) continue;
    if (isIntakeAnswered(args.responses[id])) continue;
    if (!out.includes(id)) out.push(id);
  }
  for (const id of args.nextRecommended) {
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/**
 * Drops unanswered **optional** overlay bank ids from `nextRecommended` when a matched case’s
 * `stopCondition` is satisfied and at least `minOverlayAnswered` overlay cells are filled.
 * Required policy ids are never removed.
 */
export function pruneNextRecommendedForSatisfiedCaseStops(args: {
  nextRecommended: string[];
  matches: IntakeCasePatternV1[];
  stopConditionMetByCase: Record<string, boolean>;
  responses: Record<string, unknown>;
  requiredBankIds: Set<string>;
  enabled: boolean;
}): { nextRecommended: string[]; prunedIds: string[] } {
  if (!args.enabled || args.matches.length === 0) {
    return { nextRecommended: args.nextRecommended, prunedIds: [] };
  }
  const toRemove = new Set<string>();
  for (const c of args.matches) {
    if (!args.stopConditionMetByCase[c.caseKey]) continue;
    if (countAnsweredInSet(c.overlayQuestionIds, args.responses) < c.minOverlayAnswered) continue;
    for (const qid of c.overlayQuestionIds) {
      if (args.requiredBankIds.has(qid)) continue;
      if (!isIntakeAnswered(args.responses[qid])) toRemove.add(qid);
    }
  }
  if (toRemove.size === 0) {
    return { nextRecommended: args.nextRecommended, prunedIds: [] };
  }
  const prunedIds: string[] = [];
  const out: string[] = [];
  for (const id of args.nextRecommended) {
    if (toRemove.has(id)) {
      prunedIds.push(id);
      continue;
    }
    out.push(id);
  }
  return { nextRecommended: out, prunedIds };
}
