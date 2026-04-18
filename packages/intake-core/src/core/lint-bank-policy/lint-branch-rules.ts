import { BRANCH_RULES } from '../../branch-rules.js';
import { QUESTION_BANK_V1_STUBS } from '../../question-bank.js';
import type { IntakeQuestionStub } from '../../types.js';
import branchRulesCanon from '../../branch-rules.v1.json' with { type: 'json' };

import type { LintFinding } from './types.js';

/** `not` rules must reference an existing rule id. */
export function lintBranchRulesNotReferences(): LintFinding[] {
  const rules = (branchRulesCanon as { rules: Record<string, { kind: string; inner?: string }> }).rules;
  const findings: LintFinding[] = [];
  for (const [k, v] of Object.entries(rules)) {
    if (v.kind === 'not' && v.inner && !rules[v.inner]) {
      findings.push({
        code: 'BRANCH_RULE_NOT_INVALID_INNER',
        severity: 'error',
        message: `branch-rules.v1.json: rule "${k}" references missing inner rule "${v.inner}".`,
        detail: k,
      });
    }
  }
  return findings;
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
