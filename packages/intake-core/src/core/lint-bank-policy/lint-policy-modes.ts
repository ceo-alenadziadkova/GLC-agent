import { QUESTION_BANK_V1_IDS, QUESTION_BANK_V1_STUBS } from '../../question-bank.js';
import type { IntakeQuestionStub } from '../../types.js';

import { INTAKE_POLICY_V1 } from '../load-policy.js';
import type { IntakePolicyV1 } from '../policy-types.js';

import type { LintFinding } from './types.js';

export function lintOrphanPolicyDiscoveryIds(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
  bankIds: Set<string> = QUESTION_BANK_V1_IDS,
): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const id of policy.modes.discovery.included) {
    if (!bankIds.has(id)) {
      findings.push({
        code: 'ORPHAN_POLICY_ID',
        severity: 'error',
        message: `Policy discovery.included references unknown bank id "${id}".`,
        detail: id,
      });
    }
  }
  return findings;
}

export function lintOrphanPolicyPreBriefBankIds(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
  bankIds: Set<string> = QUESTION_BANK_V1_IDS,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const inc = policy.modes.pre_brief.bankIncluded ?? [];
  for (const id of inc) {
    if (!bankIds.has(id)) {
      findings.push({
        code: 'ORPHAN_PRE_BRIEF_BANK_ID',
        severity: 'error',
        message: `Policy pre_brief.bankIncluded references unknown bank id "${id}".`,
        detail: id,
      });
    }
  }
  return findings;
}

/**
 * Every bank question must be covered by at least one policy mode's participation rule.
 * Today `full` and `express` are `all_eligible` (covers entire bank); explicit lists add more ids.
 * Fails if a future mode drops all_eligible without listing every bank id elsewhere.
 */
export function lintMissingPolicyCoverage(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
  bankIds: Set<string> = QUESTION_BANK_V1_IDS,
): LintFinding[] {
  const covered = new Set<string>();

  const touchAllEligible = (mode: { participation?: string } | undefined) => {
    if (mode?.participation === 'all_eligible') {
      for (const id of bankIds) covered.add(id);
    }
  };

  touchAllEligible(policy.modes.full);
  touchAllEligible(policy.modes.express);
  touchAllEligible(policy.modes.free_snapshot);

  if (policy.modes.discovery.participation === 'explicit') {
    for (const id of policy.modes.discovery.included) covered.add(id);
  }

  const findings: LintFinding[] = [];
  for (const id of bankIds) {
    if (!covered.has(id)) {
      findings.push({
        code: 'MISSING_POLICY_COVERAGE',
        severity: 'error',
        message: `Bank question "${id}" is not covered by any policy mode participation.`,
        detail: id,
      });
    }
  }
  return findings;
}

export function lintDuplicateDiscoveryIncluded(policy: IntakePolicyV1 = INTAKE_POLICY_V1): LintFinding[] {
  const seen = new Set<string>();
  const findings: LintFinding[] = [];
  for (const id of policy.modes.discovery.included) {
    if (seen.has(id)) {
      findings.push({
        code: 'DUPLICATE_DISCOVERY_INCLUDED',
        severity: 'error',
        message: `Duplicate id "${id}" in policy discovery.included.`,
        detail: id,
      });
    }
    seen.add(id);
  }
  return findings;
}

/** `modes.discovery.publicWizardOrder` must reference only bank ids in `discovery.included` (when set). */
export function lintPublicDiscoveryWizardOrder(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
  bankIds: Set<string> = QUESTION_BANK_V1_IDS,
): LintFinding[] {
  const order = policy.modes.discovery.publicWizardOrder;
  if (!order?.length) return [];
  const included = new Set(policy.modes.discovery.included);
  const findings: LintFinding[] = [];
  const seen = new Set<string>();
  for (const id of order) {
    if (seen.has(id)) {
      findings.push({
        code: 'DUPLICATE_PUBLIC_WIZARD_ORDER',
        severity: 'error',
        message: `Duplicate id "${id}" in policy discovery.publicWizardOrder.`,
        detail: id,
      });
    }
    seen.add(id);
    if (!bankIds.has(id)) {
      findings.push({
        code: 'PUBLIC_WIZARD_ORDER_ORPHAN',
        severity: 'error',
        message: `discovery.publicWizardOrder "${id}" is not a bank id.`,
        detail: id,
      });
    }
    if (!included.has(id)) {
      findings.push({
        code: 'PUBLIC_WIZARD_NOT_IN_DISCOVERY',
        severity: 'error',
        message: `discovery.publicWizardOrder "${id}" is not in discovery.included.`,
        detail: id,
      });
    }
  }
  return findings;
}

/**
 * Every id in pre_brief.bankIncluded must also appear in express.requiredAlways,
 * express.requiredIfVisible, or be an all_eligible bank question. An id that
 * branch-gates to hidden in all express-visible contexts creates a ghost required
 * slot that can never be satisfied.
 *
 * Detects: ids in bankIncluded that are not in the express required lists AND have
 * a branchCondition (may be hidden). Warns rather than errors because branch
 * evaluation is runtime-dependent, but surfaces candidates for manual review.
 */
export function lintPreBriefBankIncludedBranchConflicts(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
  stubs: IntakeQuestionStub[] = QUESTION_BANK_V1_STUBS,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const bankIncluded = policy.modes.pre_brief.bankIncluded ?? [];
  if (bankIncluded.length === 0) return findings;

  const expressRequired = new Set([
    ...policy.modes.express.requiredAlways,
    ...policy.modes.express.requiredIfVisible,
  ]);
  const branchById = new Map(stubs.map(s => [s.id, s.branchCondition]));

  for (const id of bankIncluded) {
    if (expressRequired.has(id)) continue;
    const branch = branchById.get(id);
    if (branch) {
      findings.push({
        code: 'PRE_BRIEF_BANK_INCLUDED_BRANCH_GATED',
        severity: 'warn',
        message: `pre_brief.bankIncluded "${id}" has branchCondition "${branch}" and is not in express required lists — may be hidden at runtime and never satisfiable.`,
        detail: id,
      });
    }
  }
  return findings;
}
