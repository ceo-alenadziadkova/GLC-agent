/**
 * Phase 0 shim: derive intake plan slices from CURRENT engine (branch + discovery filter + brief-gates SLA).
 *
 * - eligible: branch predicates only (no discovery whitelist).
 * - visible: filterVisibleQuestions / getVisibleBankStubs (current behavior).
 * - hidden: bank ids not shown in this context (complement of visible).
 * - required: resolveSlaRequiredIds for the fixture product/collection mode.
 * - deferred: always [] until layout + askStrategy (Phase 5b+); see snapshot test header comment.
 */
import { getVisibleBankStubs, resolveSlaRequiredIds } from '../intake/brief-gates.js';
import { evalBranchCondition } from '../intake/branch-rules.js';
import { QUESTION_BANK_V1_STUBS } from '../intake/question-bank.js';
import type { IntakeResponsesMap } from '../intake/types.js';
import type { IntakeBriefCollectionMode, ProductMode } from '../types/audit.js';

export interface IntakePlanSnapshotPayload {
  eligible: string[];
  visible: string[];
  required: string[];
  hidden: string[];
  deferred: string[];
}

function sortUnique(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

export function computeIntakePlanSnapshotShim(
  responses: Record<string, unknown>,
  productMode: ProductMode,
  collectionMode?: IntakeBriefCollectionMode,
): IntakePlanSnapshotPayload {
  const r = responses as IntakeResponsesMap;

  const eligible = sortUnique(
    QUESTION_BANK_V1_STUBS.filter(q => evalBranchCondition(q.branchCondition, r)).map(q => q.id),
  );

  const visible = sortUnique(getVisibleBankStubs(responses, collectionMode).map(q => q.id));

  const visibleSet = new Set(visible);
  const allBankIds = QUESTION_BANK_V1_STUBS.map(q => q.id);
  const hidden = sortUnique(allBankIds.filter(id => !visibleSet.has(id)));

  const required = sortUnique(resolveSlaRequiredIds(productMode, responses, collectionMode));

  return {
    eligible,
    visible,
    required,
    hidden,
    deferred: [],
  };
}
