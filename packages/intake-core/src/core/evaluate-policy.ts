/**
 * Policy layer — SLA / required bank ids from policy artifact (matches brief-gates.ts).
 */
import type { IntakeBriefCollectionMode, ProductMode } from '../audit-contract.js';
import type { IntakeQuestionStub } from '../types.js';
import { isIntakePolicyRichnessEnabled } from '../config/intake-flags.js';

import type { IntakePolicyV1 } from './policy-types.js';
import type { DebugTraceEntry } from './types.js';
import { INTAKE_REVENUE_BANK_ID } from '../intake-revenue.js';

function isPolicyRevenueOrVisible(id: string, visibleIdSet: Set<string>): boolean {
  return id === INTAKE_REVENUE_BANK_ID || visibleIdSet.has(id);
}

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
 * Bank + synthetic ids required for submit (parity with `buildIntakePlan` / `resolveSlaRequiredIds`).
 * Caller passes the SLA visibility set (see `IntakePlan.slaVisibleBankIds`). Identity `intake_*` fields
 * are not bank stubs and remain validated in brief-validator (`getPreBriefSubmitSlotIds`).
 */
export function computeRequiredBankIdsFromPolicy(
  policy: IntakePolicyV1,
  productMode: ProductMode,
  visibleIdSet: Set<string>,
  visibleStubsInBankOrder: IntakeQuestionStub[],
  collectionMode?: IntakeBriefCollectionMode,
): { ids: string[]; debugTrace: DebugTraceEntry[] } {
  const trace: DebugTraceEntry[] = [];
  const rich = isIntakePolicyRichnessEnabled();
  const requiredOverride = rich
    ? policy.modes[productMode].requirednessByMode?.[productMode]
    : undefined;

  if (productMode === 'free_snapshot') {
    return { ids: [], debugTrace: trace };
  }

  // pre_brief: delegate to express when policy.modes.pre_brief.inheritExpressRequired is true.
  // The type marks this field as literal `true`, but frozen artifact JSON casts bypass that
  // constraint, so we guard at runtime to prevent silent full-mode required set leaking in.
  if ((productMode as string) === 'pre_brief') {
    if (!(policy.modes.pre_brief.inheritExpressRequired as boolean)) {
      trace.push({
        layer: 'policy',
        level: 'warn',
        code: 'PRE_BRIEF_INHERIT_EXPRESS_REQUIRED_FALSE',
        message: 'policy.modes.pre_brief.inheritExpressRequired is not true — returning empty required set for pre_brief.',
      });
      return { ids: [], debugTrace: trace };
    }
    return computeRequiredBankIdsFromPolicy(
      policy,
      'express',
      visibleIdSet,
      visibleStubsInBankOrder,
      collectionMode,
    );
  }

  if (productMode === 'express') {
    const ex = policy.modes.express;
    const requiredAlways = requiredOverride?.requiredAlways ?? ex.requiredAlways;
    const requiredIfVisible = requiredOverride?.requiredIfVisible ?? ex.requiredIfVisible;
    const out: string[] = [];
    for (const id of requiredAlways) {
      if (isPolicyRevenueOrVisible(id, visibleIdSet)) {
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
    for (const id of requiredIfVisible) {
      if (visibleIdSet.has(id)) out.push(id);
    }
    return { ids: sortUniqueIds(dedupePreserveOrder(out)), debugTrace: trace };
  }

  const fromCanon = visibleStubsInBankOrder.filter(s => s.priority === 'required').map(s => s.id);
  const syntheticsDefault =
    collectionMode === 'discovery'
      ? policy.modes.discovery.syntheticRequired
      : policy.modes.full.syntheticRequired;
  const synthetics = requiredOverride?.syntheticRequired ?? syntheticsDefault;
  const candidates = [...fromCanon, ...synthetics];
  const out: string[] = [];
  for (const id of candidates) {
    if (isPolicyRevenueOrVisible(id, visibleIdSet)) {
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
