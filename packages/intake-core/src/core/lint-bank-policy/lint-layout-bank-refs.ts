import { QUESTION_BANK_V1_IDS } from '../../question-bank.js';

import { LAYOUT_RULES_V1 } from '../load-layout.js';

import type { LintFinding } from './types.js';

/** Every layout surface step / suppress id must exist in the question bank. */
export function lintLayoutReferencesUnknownBankIds(bankIds: Set<string> = QUESTION_BANK_V1_IDS): LintFinding[] {
  const findings: LintFinding[] = [];
  const surfaces = LAYOUT_RULES_V1.surfaces as Record<
    string,
    { steps?: Array<{ questionIds?: string[] }>; suppressQuestionIds?: string[] }
  >;
  for (const [surfaceKey, surface] of Object.entries(surfaces)) {
    for (const id of surface.suppressQuestionIds ?? []) {
      if (!bankIds.has(id)) {
        findings.push({
          code: 'LAYOUT_ORPHAN_ID',
          severity: 'error',
          message: `Layout surface "${surfaceKey}" suppressQuestionIds references unknown bank id "${id}".`,
          detail: id,
        });
      }
    }
    for (const step of surface.steps ?? []) {
      for (const id of step.questionIds ?? []) {
        if (!bankIds.has(id)) {
          findings.push({
            code: 'LAYOUT_ORPHAN_ID',
            severity: 'error',
            message: `Layout surface "${surfaceKey}" step references unknown bank id "${id}".`,
            detail: id,
          });
        }
      }
    }
  }
  return findings;
}
