/**
 * Canon layer — branch predicates only (ADR). No discovery or product-mode policy.
 */
import { evalBranchCondition } from '../branch-rules.js';
import type { IntakeQuestionStub, IntakeResponsesMap } from '../types.js';

import {
  getBranchAwareStubEvalOrder,
  listBankStubIdsInvalidatedByResponseKeys,
} from './branch-condition-deps.js';
import type { QuestionReason } from './types.js';

export interface CanonEligibilityResult {
  /** Bank question ids that pass branchCondition, in canonical stub order. */
  eligibleIds: string[];
  reasonsById: Record<string, QuestionReason[]>;
  /**
   * Internal cache for incremental recompute. Kept deterministic and serializable.
   */
  branchPassByCondition: Record<string, boolean>;
  passById: Record<string, boolean>;
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

  const evalOrder = getBranchAwareStubEvalOrder(stubs);
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

  const branchPassByConditionPlain: Record<string, boolean> = {};
  for (const [k, v] of branchPassByCondition.entries()) {
    branchPassByConditionPlain[k ?? '__undefined__'] = v;
  }

  return {
    eligibleIds,
    reasonsById,
    branchPassByCondition: branchPassByConditionPlain,
    passById: Object.fromEntries(passById.entries()),
  };
}

export function recomputeCanonEligibilityIncremental(args: {
  stubs: IntakeQuestionStub[];
  responses: IntakeResponsesMap;
  changedResponseKeys: string[];
  previous: Pick<CanonEligibilityResult, 'branchPassByCondition' | 'passById'>;
}): CanonEligibilityResult {
  const { stubs, responses, previous } = args;
  if (args.changedResponseKeys.length === 0) {
    return evaluateCanonEligibility(stubs, responses);
  }

  const branchPassByCondition = new Map<string | undefined, boolean>();
  for (const [k, v] of Object.entries(previous.branchPassByCondition)) {
    branchPassByCondition.set(k === '__undefined__' ? undefined : k, v);
  }
  const passById = new Map<string, boolean>(Object.entries(previous.passById));

  const invalidatedIds = new Set(
    listBankStubIdsInvalidatedByResponseKeys(args.changedResponseKeys, stubs),
  );
  for (const id of invalidatedIds) {
    const q = stubs.find(row => row.id === id);
    if (q?.branchCondition !== undefined) {
      branchPassByCondition.delete(q.branchCondition);
    }
    passById.delete(id);
  }

  const evalCached = (condition: string | undefined): boolean => {
    if (branchPassByCondition.has(condition)) {
      return branchPassByCondition.get(condition)!;
    }
    const pass = evalBranchCondition(condition, responses);
    branchPassByCondition.set(condition, pass);
    return pass;
  };

  const evalOrder = getBranchAwareStubEvalOrder(stubs);
  for (const q of evalOrder) {
    if (!passById.has(q.id)) {
      passById.set(q.id, evalCached(q.branchCondition));
    }
  }

  const eligibleIds: string[] = [];
  const reasonsById: Record<string, QuestionReason[]> = {};
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

  const branchPassByConditionPlain: Record<string, boolean> = {};
  for (const [k, v] of branchPassByCondition.entries()) {
    branchPassByConditionPlain[k ?? '__undefined__'] = v;
  }

  return {
    eligibleIds,
    reasonsById,
    branchPassByCondition: branchPassByConditionPlain,
    passById: Object.fromEntries(passById.entries()),
  };
}
