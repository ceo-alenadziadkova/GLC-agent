/**
 * Branch dependency edges for intake trace UI (canon stubs + BRANCH_RULE_RESPONSE_KEYS).
 */
import {
  listBranchRuleResponseKeys,
  providerStubIdsForResponseKey,
} from '../../../../server/src/intake/core/branch-condition-deps';
import type { IntakeQuestionStub } from '../../../../server/src/intake/types';

export function computeBranchUpstreamIds(
  questionId: string,
  stubs: readonly IntakeQuestionStub[],
): string[] {
  const stub = stubs.find(s => s.id === questionId);
  if (!stub?.branchCondition) return [];
  const stubIdSet = new Set(stubs.map(s => s.id));
  const preds = new Set<string>();
  for (const key of listBranchRuleResponseKeys(stub.branchCondition)) {
    for (const p of providerStubIdsForResponseKey(key, stubIdSet)) {
      if (p !== questionId) preds.add(p);
    }
  }
  return [...preds].sort((a, b) => a.localeCompare(b));
}

export function computeBranchDownstreamIds(
  questionId: string,
  stubs: readonly IntakeQuestionStub[],
): string[] {
  const stubIdSet = new Set(stubs.map(s => s.id));
  const out = new Set<string>();
  for (const q of stubs) {
    if (q.id === questionId || !q.branchCondition) continue;
    const keys = listBranchRuleResponseKeys(q.branchCondition);
    for (const k of keys) {
      for (const p of providerStubIdsForResponseKey(k, stubIdSet)) {
        if (p === questionId) {
          out.add(q.id);
          break;
        }
      }
    }
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}
