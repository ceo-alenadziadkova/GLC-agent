/**
 * Static dependency hints: which response keys each BRANCH_RULES predicate may read.
 * Used for docs, topo eval order (ADR Phase C), future incremental recompute (ADR Phase C2), and linting.
 */
import { QUESTION_BANK_V1_STUBS } from '../question-bank.js';
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

/**
 * Precomputed topo eval order for the shipped v1 bank (same reference as `resolveIntakeArtifacts` stubs).
 */
export const QUESTION_BANK_V1_STUB_EVAL_ORDER: readonly IntakeQuestionStub[] =
  buildBranchAwareStubEvalOrder(QUESTION_BANK_V1_STUBS);

const STUB_EVAL_ORDER_CACHE = new WeakMap<IntakeQuestionStub[], readonly IntakeQuestionStub[]>();

function buildResponseKeyToDependentStubIds(stubs: IntakeQuestionStub[]): Map<string, Set<string>> {
  const stubIdSet = new Set(stubs.map(s => s.id));
  const rev = new Map<string, Set<string>>();
  for (const q of stubs) {
    if (!q.branchCondition) continue;
    for (const key of listBranchRuleResponseKeys(q.branchCondition)) {
      for (const prov of providerStubIdsForResponseKey(key, stubIdSet)) {
        let set = rev.get(prov);
        if (!set) {
          set = new Set();
          rev.set(prov, set);
        }
        set.add(q.id);
      }
    }
  }
  return rev;
}

const RESPONSE_KEY_DEPS_V1 = buildResponseKeyToDependentStubIds(QUESTION_BANK_V1_STUBS);
const RESPONSE_KEY_DEPS_CACHE = new WeakMap<IntakeQuestionStub[], Map<string, Set<string>>>();

const CACHE_STATS = {
  evalOrderBuilds: 0,
  responseDepsBuilds: 0,
};

export function getBranchDepsCacheStats(): {
  evalOrderBuilds: number;
  responseDepsBuilds: number;
} {
  return {
    evalOrderBuilds: CACHE_STATS.evalOrderBuilds,
    responseDepsBuilds: CACHE_STATS.responseDepsBuilds,
  };
}

export function resetBranchDepsCacheStats(): void {
  CACHE_STATS.evalOrderBuilds = 0;
  CACHE_STATS.responseDepsBuilds = 0;
}

export function getBranchAwareStubEvalOrder(stubs: IntakeQuestionStub[]): readonly IntakeQuestionStub[] {
  if (stubs === QUESTION_BANK_V1_STUBS) return QUESTION_BANK_V1_STUB_EVAL_ORDER;
  const cached = STUB_EVAL_ORDER_CACHE.get(stubs);
  if (cached) return cached;
  const built = buildBranchAwareStubEvalOrder(stubs);
  STUB_EVAL_ORDER_CACHE.set(stubs, built);
  CACHE_STATS.evalOrderBuilds += 1;
  return built;
}

function getResponseKeyDepsMap(stubs: IntakeQuestionStub[]): Map<string, Set<string>> {
  if (stubs === QUESTION_BANK_V1_STUBS) return RESPONSE_KEY_DEPS_V1;
  const cached = RESPONSE_KEY_DEPS_CACHE.get(stubs);
  if (cached) return cached;
  const built = buildResponseKeyToDependentStubIds(stubs);
  RESPONSE_KEY_DEPS_CACHE.set(stubs, built);
  CACHE_STATS.responseDepsBuilds += 1;
  return built;
}

/**
 * Bank stub ids that should be re-evaluated for branch eligibility when the given response keys change.
 * Use with `buildIntakePlan` / `evaluateCanonEligibility` incremental paths; full replan remains valid.
 */
export function listBankStubIdsInvalidatedByResponseKeys(
  changedResponseKeys: Iterable<string>,
  stubs: IntakeQuestionStub[] = QUESTION_BANK_V1_STUBS,
): string[] {
  const map = getResponseKeyDepsMap(stubs);

  const out = new Set<string>();
  for (const k of changedResponseKeys) {
    const set = map.get(k);
    if (set) for (const id of set) out.add(id);
  }
  return [...out].sort((a, b) => a.localeCompare(b));
}
