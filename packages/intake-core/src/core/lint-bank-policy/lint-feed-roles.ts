import { QUESTION_BANK_V1_IDS } from '../../question-bank.js';
import { QUESTION_FEED_ROLES } from '../../question-feed-roles.js';

import type { LintFinding } from './types.js';

/** `question-feed-roles.v1.json` keys must match bank question ids 1:1. */
export function lintQuestionFeedRolesAlignBank(bankIds: Set<string> = QUESTION_BANK_V1_IDS): LintFinding[] {
  const findings: LintFinding[] = [];
  for (const id of bankIds) {
    if (!QUESTION_FEED_ROLES[id]) {
      findings.push({
        code: 'FEED_ROLES_MISSING_BANK_ID',
        severity: 'error',
        message: `question-feed-roles.v1.json: missing feeds for bank id "${id}".`,
        detail: id,
      });
    }
  }
  for (const id of Object.keys(QUESTION_FEED_ROLES)) {
    if (!bankIds.has(id)) {
      findings.push({
        code: 'FEED_ROLES_UNKNOWN_BANK_ID',
        severity: 'error',
        message: `question-feed-roles.v1.json: unknown bank id "${id}".`,
        detail: id,
      });
    }
  }
  return findings;
}
