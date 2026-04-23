import caseCatalog from '../../artifacts/intake-case-patterns.v1.json' with { type: 'json' };
import { QUESTION_BANK_V1_IDS } from '../../question-bank.js';
import criticalSignals from '../../artifacts/intake-critical-signals-pilot-1.0.0.json' with { type: 'json' };
import type { IntakeCasePatternCatalogV1, CasePatternPrecondition } from '../case-pattern-types.js';
import type { LintFinding } from './types.js';

const SIGNAL_KEYS = new Set(Object.keys((criticalSignals as { signals?: Record<string, unknown> }).signals ?? {}));

function isoDateOk(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= '2026-04-24';
}

function lintPrecondition(pre: CasePatternPrecondition, caseKey: string): LintFinding[] {
  const f: LintFinding[] = [];
  if (pre.kind === 'bank') {
    if (!QUESTION_BANK_V1_IDS.has(pre.bankId)) {
      f.push({
        code: 'CASE_PATTERN_PRECONDITION_UNKNOWN_BANK',
        severity: 'error',
        message: `case "${caseKey}" preconditions reference unknown bank id "${pre.bankId}".`,
        detail: caseKey,
      });
    }
  } else {
    if (!SIGNAL_KEYS.has(pre.signalKey)) {
      f.push({
        code: 'CASE_PATTERN_PRECONDITION_UNKNOWN_SIGNAL',
        severity: 'error',
        message: `case "${caseKey}" preconditions reference unknown signal key "${pre.signalKey}".`,
        detail: caseKey,
      });
    }
  }
  return f;
}

export function lintCasePatternsV1(): LintFinding[] {
  const catalog = caseCatalog as IntakeCasePatternCatalogV1;
  const findings: LintFinding[] = [];
  const keys = new Set<string>();
  for (const c of catalog.cases) {
    if (keys.has(c.caseKey)) {
      findings.push({
        code: 'CASE_PATTERN_DUPLICATE_KEY',
        severity: 'error',
        message: `duplicate caseKey "${c.caseKey}" in case pattern catalog`,
        detail: c.caseKey,
      });
    }
    keys.add(c.caseKey);
    if (!c.overlayQuestionIds || c.overlayQuestionIds.length === 0) {
      findings.push({
        code: 'CASE_PATTERN_EMPTY_OVERLAY',
        severity: 'error',
        message: `case "${c.caseKey}" has empty overlayQuestionIds`,
        detail: c.caseKey,
      });
    }
    for (const id of c.overlayQuestionIds) {
      if (!QUESTION_BANK_V1_IDS.has(id)) {
        findings.push({
          code: 'CASE_PATTERN_UNKNOWN_OVERLAY_ID',
          severity: 'error',
          message: `case "${c.caseKey}" references unknown bank id "${id}" in overlay`,
          detail: c.caseKey,
        });
      }
    }
    if (c.minOverlayAnswered < 0 || c.minOverlayAnswered > c.overlayQuestionIds.length) {
      findings.push({
        code: 'CASE_PATTERN_MIN_OVERLAY_INVALID',
        severity: 'error',
        message: `case "${c.caseKey}" minOverlayAnswered out of range`,
        detail: c.caseKey,
      });
    }
    if (!isoDateOk(c.reviewByIsoDate)) {
      findings.push({
        code: 'CASE_PATTERN_REVIEW_DATE_STALE',
        severity: 'error',
        message: `case "${c.caseKey}" reviewByIsoDate must be a valid future cadence date (>= 2026-04-24)`,
        detail: c.reviewByIsoDate,
      });
    }
    for (const pre of c.preconditions) {
      findings.push(...lintPrecondition(pre, c.caseKey));
    }
  }
  return findings;
}
