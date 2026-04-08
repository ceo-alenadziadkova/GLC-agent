/**
 * Phase 0 shim: derive intake plan slices from CURRENT engine (branch + discovery filter + brief-gates SLA).
 *
 * - eligible: policy-visible bank ids (canon + policy; same as `buildIntakePlan` without layout surface).
 * - visible: getVisibleBankStubs (no `surface` here — equals eligible as sorted sets).
 * - hidden: bank ids not in this context (complement of visible).
 * - required: resolveSlaRequiredIds for the fixture product/collection mode.
 * - deferred: always [] here (no `surface`); layout deferral is tested in intake-layout.test.ts.
 */
import { getVisibleBankStubs, resolveSlaRequiredIds } from '../intake/brief-gates.js';
import { QUESTION_BANK_V1_STUBS } from '../intake/question-bank.js';
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
  const visible = sortUnique(getVisibleBankStubs(responses, collectionMode).map(q => q.id));
  const eligible = visible;

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
