import type { IntakeCriticalSignalConfidence } from '../audit-contract.js';
import { getResponseString, isIntakeAnswered } from '../unwrap.js';
import type { IntakeCasePatternCatalogV1, IntakeCasePatternV1 } from './case-pattern-types.js';
import type { CasePatternPrecondition } from './case-pattern-types.js';

const CONFIDENCE_ORDER: IntakeCriticalSignalConfidence[] = ['unknown', 'low', 'medium', 'high'];

function rankConfidence(c: IntakeCriticalSignalConfidence | undefined): number {
  if (!c) return -1;
  return Math.max(0, CONFIDENCE_ORDER.indexOf(c));
}

function meetsAtLeast(
  c: IntakeCriticalSignalConfidence | undefined,
  atLeast: IntakeCriticalSignalConfidence,
): boolean {
  if (!c) return false;
  return rankConfidence(c) >= rankConfidence(atLeast);
}

function matchesBankPre(pre: CasePatternPrecondition, responses: Record<string, unknown>): boolean {
  if (pre.kind !== 'bank') return false;
  const raw = responses[pre.bankId];
  if ('isAnswered' in pre && pre.isAnswered === true) {
    return isIntakeAnswered(raw);
  }
  const s = getResponseString(responses, pre.bankId).trim();
  if ('equals' in pre) {
    return s === pre.equals.trim();
  }
  if ('inSet' in pre) {
    const set = new Set(pre.inSet.map(x => x.trim()));
    return set.has(s);
  }
  return false;
}

function matchesSignalPre(
  p: { signalKey: string; confidenceAtLeast: IntakeCriticalSignalConfidence },
  confidenceByKey: Record<string, IntakeCriticalSignalConfidence>,
): boolean {
  const c = confidenceByKey[p.signalKey] ?? 'unknown';
  return meetsAtLeast(c, p.confidenceAtLeast);
}

export function matchesCasePattern(
  c: IntakeCasePatternV1,
  args: {
    responses: Record<string, unknown>;
    confidenceByKey: Record<string, IntakeCriticalSignalConfidence>;
  },
): boolean {
  for (const pre of c.preconditions) {
    if (pre.kind === 'bank') {
      if (!matchesBankPre(pre, args.responses)) return false;
    } else {
      if (!matchesSignalPre(pre, args.confidenceByKey)) return false;
    }
  }
  return true;
}

export function matchCasePatterns(args: {
  responses: Record<string, unknown>;
  confidenceByKey: Record<string, IntakeCriticalSignalConfidence>;
  catalog: IntakeCasePatternCatalogV1;
}): IntakeCasePatternV1[] {
  return args.catalog.cases.filter(c => matchesCasePattern(c, args));
}

/**
 * When every listed signal's confidence meets the minimum floor, the case is "sufficient" for overlay stop semantics.
 */
export function evaluateCaseStopCondition(
  c: IntakeCasePatternV1,
  confidenceByKey: Record<string, IntakeCriticalSignalConfidence>,
): boolean {
  const { keys, min } = c.stopCondition.signalKeysWithConfidenceAtLeast;
  const floor: IntakeCriticalSignalConfidence = min;
  for (const key of keys) {
    const co = confidenceByKey[key] ?? 'unknown';
    if (!meetsAtLeast(co, floor)) return false;
  }
  return true;
}

export function countAnsweredInSet(
  overlayIds: string[],
  responses: Record<string, unknown>,
): number {
  let n = 0;
  for (const id of overlayIds) {
    if (isIntakeAnswered(responses[id])) n += 1;
  }
  return n;
}
