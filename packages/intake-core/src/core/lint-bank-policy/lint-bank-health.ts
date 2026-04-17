import questionBankCanon from '../../question-bank.v1.json' with { type: 'json' };

import type { LintFinding } from './types.js';

/** Bank JSON: deprecatedAt + priority required is inconsistent. */
export function lintDeprecatedStillRequired(): LintFinding[] {
  const findings: LintFinding[] = [];
  const raw = questionBankCanon as {
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
