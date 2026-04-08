/**
 * Canon layer — branch predicates only (ADR). No discovery or product-mode policy.
 */
import { evalBranchCondition } from '../branch-rules.js';
import { QUESTION_BANK_V1_STUBS } from '../question-bank.js';
import type { IntakeQuestionStub, IntakeResponsesMap } from '../types.js';

import {
  buildBranchAwareStubEvalOrder,
  QUESTION_BANK_V1_STUB_EVAL_ORDER,
} from './branch-condition-deps.js';
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

  const evalOrder =
    stubs === QUESTION_BANK_V1_STUBS ? QUESTION_BANK_V1_STUB_EVAL_ORDER : buildBranchAwareStubEvalOrder(stubs);
  const passById = new Map<string, boolean>();
  for (const q of evalOrder) {
    passById.set(q.id, evalCached(q.branchCondition));
  }

  for (const q of stubs) {
    const pass = passById.get(q.id) ?? evalCached(q.branchCondition);
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
