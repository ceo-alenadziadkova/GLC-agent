import { INTAKE_REVENUE_BANK_ID } from '../../intake-revenue.js';

/** Allowed top-level keys in question-bank.v1.json (canon contract). */
export const CANON_BANK_ROOT_KEYS = new Set(['version', 'optionCatalogs', 'questions']);

/** Allowed keys per question row in question-bank.v1.json. */
export const CANON_QUESTION_JSON_KEYS = new Set([
  'id',
  'section',
  'priority',
  'branch',
  'label',
  'reportUse',
  'answer',
  'entityRole',
  'confidenceImpact',
  'sensitivity',
  'askOnce',
  'answerFreshnessDays',
  'owner',
  'introducedInVersion',
  'deprecatedAt',
]);

export const CANON_ANSWER_TYPES = new Set([
  'text',
  'textarea',
  'single_select',
  'multi_select',
  'scale',
  'boolean',
]);

export const CANON_IMPACT_LEVELS = new Set(['low', 'medium', 'high']);

/**
 * Ids permitted in `syntheticRequired` even when the same id exists as a bank question.
 * Keep this minimal: the usual rule is still "no accidental bank id in synthetics".
 * Today: revenue is canonically `INTAKE_REVENUE_BANK_ID` in both places (ADR Phase 5).
 */
export const ALLOWED_SYNTHETIC_BANK_OVERLAP: ReadonlySet<string> = new Set([INTAKE_REVENUE_BANK_ID]);
