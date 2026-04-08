/**
 * Canon layer — branch predicates only (ADR). No discovery or product-mode policy.
 */
import { evalBranchCondition } from '../branch-rules.js';
import type { IntakeQuestionStub, IntakeResponsesMap } from '../types.js';

import type { QuestionReason } from './types.js';

export interface CanonEligibilityResult {
  /** Bank question ids that pass branchCondition, in canonical stub order. */
  eligibleIds: string[];
  reasonsById: Record<string, QuestionReason[]>;
}

/**
 * One predicate result per unique `branchCondition` per plan build — avoids redundant work
 * when many stubs share the same rule (ADR Phase C v1).
 */
export function evaluateCanonEligibility(
  stubs: IntakeQuestionStub[],
  responses: IntakeResponsesMap,
): CanonEligibilityResult {
  const eligibleIds: string[] = [];
  const reasonsById: Record<string, QuestionReason[]> = {};
  const branchPassByCondition = new Map<string | undefined, boolean>();

  const evalCached = (condition: string | undefined): boolean => {
    if (branchPassByCondition.has(condition)) {
      return branchPassByCondition.get(condition)!;
    }
    const pass = evalBranchCondition(condition, responses);
    branchPassByCondition.set(condition, pass);
    return pass;
  };

  for (const q of stubs) {
    const pass = evalCached(q.branchCondition);
    if (pass) {
      eligibleIds.push(q.id);
      reasonsById[q.id] = [
        { questionId: q.id, layer: 'canon', state: 'eligible', code: 'BRANCH_OK' },
      ];
    } else {
      reasonsById[q.id] = [
        {
          questionId: q.id,
          layer: 'canon',
          state: 'hidden',
          code: 'BRANCH_FALSE',
          detail: q.branchCondition,
        },
      ];
    }
  }

  return { eligibleIds, reasonsById };
}
