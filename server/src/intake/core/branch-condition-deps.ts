/**
 * Static dependency hints: which response keys each BRANCH_RULES predicate may read.
 * Used for docs, topo eval order (ADR Phase C), future incremental recompute (ADR Phase C2), and linting.
 */
import type { IntakeQuestionStub } from '../types.js';

export const BRANCH_RULE_RESPONSE_KEYS: Readonly<Record<string, readonly string[]>> = {
  has_website: ['a5'],
  no_website: ['a5'],
  nosite_social: ['a5', 'c_nosite_1'],
  is_hospitality: ['a2', 'intake_industry'],
  is_real_estate: ['a2', 'intake_industry'],
  is_restaurant: ['a2', 'intake_industry'],
  is_services: ['a2', 'intake_industry'],
  is_healthcare: ['a2', 'intake_industry'],
  is_marine: ['a2', 'intake_industry'],
  has_crm: ['d1'],
  no_crm: ['d1'],
  handles_payments: ['a6'],
  not_solo: ['a4'],
  spain_based: ['a3'],
};

export function listBranchRuleResponseKeys(ruleKey: string): readonly string[] {
  return BRANCH_RULE_RESPONSE_KEYS[ruleKey] ?? [];
}

/**
 * Map a response key to bank stub ids that may populate it for branch evaluation.
 * Keys outside the bank (no stub row) yield no deps — predicate still reads `responses` at runtime.
 */
export function providerStubIdsForResponseKey(key: string, stubIdSet: ReadonlySet<string>): string[] {
  if (stubIdSet.has(key)) return [key];
  if (key === 'intake_industry' && stubIdSet.has('a2')) return ['a2'];
  return [];
}

function listResponseKeysForStubBranch(q: IntakeQuestionStub): readonly string[] {
  if (!q.branchCondition) return [];
  return listBranchRuleResponseKeys(q.branchCondition);
}

/**
 * Topological order of stubs so that for each stub, any bank ids it lists in
 * {@link BRANCH_RULE_RESPONSE_KEYS} for its `branchCondition` appear earlier in the order.
 * Tie-break: original `stubs` array index (stable, deterministic).
 *
 * If a cycle is detected (should not happen for the v1 bank), appends remaining stubs in canonical order.
 */
export function buildBranchAwareStubEvalOrder(stubs: IntakeQuestionStub[]): IntakeQuestionStub[] {
  if (stubs.length <= 1) return [...stubs];

  const stubIdSet = new Set(stubs.map(s => s.id));
  const indexById = new Map(stubs.map((s, i) => [s.id, i] as const));

  const successors = new Map<string, Set<string>>();
  for (const s of stubs) {
    successors.set(s.id, new Set());
  }

  for (const q of stubs) {
    const predecessors = new Set<string>();
    for (const key of listResponseKeysForStubBranch(q)) {
      for (const p of providerStubIdsForResponseKey(key, stubIdSet)) {
        if (p !== q.id) predecessors.add(p);
      }
    }
    for (const p of predecessors) {
      if (!stubIdSet.has(p)) continue;
      successors.get(p)!.add(q.id);
    }
  }

  const inDegree = new Map<string, number>();
  for (const s of stubs) {
    inDegree.set(s.id, 0);
  }
  for (const p of stubs) {
    for (const succ of successors.get(p.id)!) {
      inDegree.set(succ, (inDegree.get(succ) ?? 0) + 1);
    }
  }

  const result: IntakeQuestionStub[] = [];
  const placed = new Set<string>();

  while (placed.size < stubs.length) {
    const batch = stubs
      .filter(s => !placed.has(s.id) && (inDegree.get(s.id) ?? 0) === 0)
      .sort((a, b) => indexById.get(a.id)! - indexById.get(b.id)!);

    if (batch.length === 0) {
      for (const s of stubs) {
        if (!placed.has(s.id)) {
          result.push(s);
          placed.add(s.id);
        }
      }
      break;
    }

    for (const q of batch) {
      result.push(q);
      placed.add(q.id);
      for (const succId of successors.get(q.id)!) {
        inDegree.set(succId, (inDegree.get(succId) ?? 0) - 1);
      }
    }
  }

  return result;
}
