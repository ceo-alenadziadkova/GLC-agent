/**
 * Phase 0 shim: snapshot payloads from `buildIntakePlan` (no layout surface).
 *
 * Update snapshots: UPDATE_INTAKE_PLAN_SNAPSHOT=1 npx vitest run server/src/tests/intake-plan-snapshot.test.ts
 */
import { buildIntakePlan } from '../intake/core/build-intake-plan.js';
import type { IntakeBriefCollectionMode, ProductMode } from '../types/audit.js';

export interface IntakePlanSnapshotPayload {
  eligible: string[];
  visible: string[];
  required: string[];
  hidden: string[];
  deferred: string[];
  slaVisibleBankIds: string[];
}

function sortUnique(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

export function computeIntakePlanSnapshotShim(
  responses: Record<string, unknown>,
  productMode: ProductMode,
  collectionMode?: IntakeBriefCollectionMode,
): IntakePlanSnapshotPayload {
  const plan = buildIntakePlan({ responses, productMode, collectionMode });
  return {
    eligible: sortUnique(plan.eligible),
    visible: sortUnique(plan.visible),
    required: sortUnique(plan.required),
    hidden: sortUnique(plan.hidden),
    deferred: sortUnique(plan.deferred),
    slaVisibleBankIds: sortUnique(plan.slaVisibleBankIds),
  };
}
