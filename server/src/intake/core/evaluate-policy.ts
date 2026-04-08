/**
 * Policy layer — SLA / required bank ids from policy artifact (matches brief-gates.ts).
 */
import type { IntakeBriefCollectionMode, ProductMode } from '../../types/audit.js';
import type { IntakeQuestionStub } from '../types.js';

import type { IntakePolicyV1 } from './policy-types.js';
import type { DebugTraceEntry } from './types.js';

/** Same ids as brief-gates: insertion order, first occurrence wins. */
function dedupePreserveOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function sortUniqueIds(ids: string[]): string[] {
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
}

/**
 * Bank + synthetic ids required for submit (parity with resolveSlaRequiredIds).
 * Does not add pre_brief intake_* identity ids — pre-brief submit slots stay in brief-validator (`getPreBriefSubmitSlotIds`).
 */
export function computeRequiredBankIdsFromPolicy(
  policy: IntakePolicyV1,
  productMode: ProductMode,
  visibleIdSet: Set<string>,
  visibleStubsInBankOrder: IntakeQuestionStub[],
  collectionMode?: IntakeBriefCollectionMode,
): { ids: string[]; debugTrace: DebugTraceEntry[] } {
  const trace: DebugTraceEntry[] = [];

  if (productMode === 'free_snapshot') {
    return { ids: [], debugTrace: trace };
  }

  if (productMode === 'express') {
    const ex = policy.modes.express;
    const out: string[] = [];
    for (const id of ex.requiredAlways) {
      if (id === 'revenue_model' || visibleIdSet.has(id)) {
        out.push(id);
      } else {
        trace.push({
          layer: 'policy',
          level: 'warn',
          code: 'EXPRESS_REQUIRED_NOT_VISIBLE',
          message: `Policy requiredAlways "${id}" is not visible — omitted (hidden wins).`,
        });
      }
    }
    for (const id of ex.requiredIfVisible) {
      if (visibleIdSet.has(id)) out.push(id);
    }
    return { ids: sortUniqueIds(dedupePreserveOrder(out)), debugTrace: trace };
  }

  const fromCanon = visibleStubsInBankOrder.filter(s => s.priority === 'required').map(s => s.id);
  const synthetics =
    collectionMode === 'discovery'
      ? policy.modes.discovery.syntheticRequired
      : policy.modes.full.syntheticRequired;
  const candidates = [...fromCanon, ...synthetics];
  const out: string[] = [];
  for (const id of candidates) {
    if (id === 'revenue_model' || visibleIdSet.has(id)) {
      out.push(id);
    } else {
      trace.push({
        layer: 'policy',
        level: 'warn',
        code: 'FULL_REQUIRED_NOT_VISIBLE',
        message: `Required candidate "${id}" is not visible — omitted (hidden wins).`,
      });
    }
  }

  return { ids: sortUniqueIds(dedupePreserveOrder(out)), debugTrace: trace };
}
