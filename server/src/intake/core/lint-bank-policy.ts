/**
 * Static checks for question bank + intake policy (Phase 3). Safe to run in CI.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BRANCH_RULES } from '../branch-rules.js';
import { QUESTION_BANK_V1_STUBS, QUESTION_BANK_V1_IDS } from '../question-bank.js';
import type { IntakeQuestionStub } from '../types.js';

import { INTAKE_POLICY_V1 } from './load-policy.js';
import type { IntakePolicyV1 } from './policy-types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE_DIR = __dirname;

export type LintSeverity = 'error' | 'warn';

export interface LintFinding {
  code: string;
  severity: LintSeverity;
  message: string;
  detail?: string;
}

export function lintUnknownBranchRefs(stubs: IntakeQuestionStub[] = QUESTION_BANK_V1_STUBS): LintFinding[] {
  const findings: LintFinding[] = [];
  const ruleKeys = new Set(Object.keys(BRANCH_RULES));
  for (const q of stubs) {
    const b = q.branchCondition;
    if (!b) continue;
    if (!ruleKeys.has(b)) {
      findings.push({
        code: 'UNKNOWN_BRANCH_REF',
        severity: 'error',
        message: `Question "${q.id}" references unknown branchCondition "${b}" (not in BRANCH_RULES).`,
        detail: q.id,
      });
    }
  }
  return findings;
}

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

/** Synthetic / SLA ids must not reuse a real bank question id as a key. */
export function lintSyntheticCollision(
  policy: IntakePolicyV1 = INTAKE_POLICY_V1,
  bankIds: Set<string> = QUESTION_BANK_V1_IDS,
): LintFinding[] {
  const findings: LintFinding[] = [];
  const synthetics = new Set([
    ...policy.modes.full.syntheticRequired,
    ...policy.modes.discovery.syntheticRequired,
  ]);
  for (const id of synthetics) {
    if (bankIds.has(id)) {
      findings.push({
        code: 'SYNTHETIC_COLLISION',
        severity: 'error',
        message: `Synthetic required id "${id}" collides with a bank question id.`,
        detail: id,
      });
    }
  }
  for (const id of policy.modes.express.requiredAlways) {
    if (id !== 'revenue_model' && !bankIds.has(id)) {
      findings.push({
        code: 'EXPRESS_REQUIRED_ORPHAN',
        severity: 'error',
        message: `Express requiredAlways "${id}" is not a bank id and not revenue_model.`,
        detail: id,
      });
    }
  }
  for (const id of policy.modes.express.requiredIfVisible) {
    if (!bankIds.has(id)) {
      findings.push({
        code: 'EXPRESS_IF_VISIBLE_ORPHAN',
        severity: 'error',
        message: `Express requiredIfVisible "${id}" is not a bank question id.`,
        detail: id,
      });
    }
  }
  return findings;
}

/** Bank JSON: deprecatedAt + priority required is inconsistent. */
export function lintDeprecatedStillRequired(): LintFinding[] {
  const findings: LintFinding[] = [];
  const bankPath = join(__dirname, '..', 'question-bank.v1.json');
  const raw = JSON.parse(readFileSync(bankPath, 'utf8')) as {
    questions: Array<{ id: string; priority?: string; deprecatedAt?: string }>;
  };
  for (const q of raw.questions) {
    if (q.deprecatedAt && q.priority === 'required') {
      findings.push({
        code: 'DEPRECATED_STILL_REQUIRED',
        severity: 'warn',
        message: `Question "${q.id}" is required but has deprecatedAt "${q.deprecatedAt}".`,
        detail: q.id,
      });
    }
  }
  return findings;
}

const FORBIDDEN_PATTERNS: { code: string; pattern: RegExp; hint: string }[] = [
  { code: 'FORBIDDEN_IMPORT_FS', pattern: /\bfrom\s+['"]node:fs['"]|\bfrom\s+['"]fs['"]/, hint: 'Do not use fs in intake/core (keep isomorphic).' },
  { code: 'FORBIDDEN_IMPORT_PATH', pattern: /\bfrom\s+['"]node:path['"]|\bfrom\s+['"]path['"]/, hint: 'Do not use path in intake/core.' },
  { code: 'FORBIDDEN_CHILD_PROCESS', pattern: /child_process/, hint: 'No child_process in intake/core.' },
];

const ALLOWLIST_CORE_FILES = new Set(['lint-bank-policy.ts']);

/** Scan intake/core sources for Node-only patterns (excluding allowlisted files). */
export function lintForbiddenImportsInCore(coreDir: string = CORE_DIR): LintFinding[] {
  const findings: LintFinding[] = [];
  const names = readdirSync(coreDir).filter(f => f.endsWith('.ts'));
  for (const name of names) {
    if (ALLOWLIST_CORE_FILES.has(name)) continue;
    const abs = join(coreDir, name);
    const content = readFileSync(abs, 'utf8');
    for (const { code, pattern, hint } of FORBIDDEN_PATTERNS) {
      if (pattern.test(content)) {
        findings.push({
          code,
          severity: 'error',
          message: `${name}: ${hint}`,
          detail: name,
        });
      }
    }
    if (/\bprocess\.env\b/.test(content)) {
      findings.push({
        code: 'FORBIDDEN_PROCESS_ENV',
        severity: 'error',
        message: `${name}: Do not use process.env in intake/core (keep isomorphic).`,
        detail: name,
      });
    }
  }
  return findings;
}

export function lintBankAndPolicyAll(): LintFinding[] {
  return [
    ...lintUnknownBranchRefs(),
    ...lintMissingPolicyCoverage(),
    ...lintOrphanPolicyDiscoveryIds(),
    ...lintDuplicateDiscoveryIncluded(),
    ...lintSyntheticCollision(),
    ...lintDeprecatedStillRequired(),
    ...lintForbiddenImportsInCore(),
  ];
}
