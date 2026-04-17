import { BRIEF_ANSWER_STRING_MAX } from '../../brief-answer-limits.js';
import questionBankCanon from '../../question-bank.v1.json' with { type: 'json' };

import {
  CANON_ANSWER_TYPES,
  CANON_BANK_ROOT_KEYS,
  CANON_IMPACT_LEVELS,
  CANON_QUESTION_JSON_KEYS,
} from './canon-constants.js';
import type { LintFinding } from './types.js';

function lintCanonOptionalQuestionMetadata(id: string, q: Record<string, unknown>, findings: LintFinding[]): void {
  if ('entityRole' in q) {
    if (typeof q.entityRole !== 'string' || q.entityRole.trim() === '') {
      findings.push({
        code: 'CANON_BAD_ENTITY_ROLE',
        severity: 'error',
        message: `question "${id}": entityRole must be a non-empty string when set.`,
        detail: id,
      });
    }
  }
  if ('confidenceImpact' in q) {
    const v = q.confidenceImpact;
    if (typeof v !== 'string' || !CANON_IMPACT_LEVELS.has(v)) {
      findings.push({
        code: 'CANON_BAD_CONFIDENCE_IMPACT',
        severity: 'error',
        message: `question "${id}": confidenceImpact must be one of low|medium|high.`,
        detail: id,
      });
    }
  }
  if ('sensitivity' in q) {
    const v = q.sensitivity;
    if (typeof v !== 'string' || !CANON_IMPACT_LEVELS.has(v)) {
      findings.push({
        code: 'CANON_BAD_SENSITIVITY',
        severity: 'error',
        message: `question "${id}": sensitivity must be one of low|medium|high.`,
        detail: id,
      });
    }
  }
  if ('askOnce' in q && typeof q.askOnce !== 'boolean') {
    findings.push({
      code: 'CANON_BAD_ASK_ONCE',
      severity: 'error',
      message: `question "${id}": askOnce must be a boolean when set.`,
      detail: id,
    });
  }
  if ('answerFreshnessDays' in q) {
    const n = q.answerFreshnessDays;
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      findings.push({
        code: 'CANON_BAD_FRESHNESS',
        severity: 'error',
        message: `question "${id}": answerFreshnessDays must be a non-negative integer when set.`,
        detail: id,
      });
    }
  }
  for (const k of ['owner', 'introducedInVersion', 'deprecatedAt'] as const) {
    if (k in q && typeof q[k] !== 'string') {
      findings.push({
        code: 'CANON_BAD_STRING_META',
        severity: 'error',
        message: `question "${id}": ${k} must be a string when set.`,
        detail: id,
      });
    }
  }
}

function lintCanonAnswerObject(
  id: string,
  answer: unknown,
  optionCatalogs: Record<string, unknown> | undefined,
  findings: LintFinding[],
): void {
  if (answer == null || typeof answer !== 'object' || Array.isArray(answer)) {
    findings.push({
      code: 'CANON_ANSWER_NOT_OBJECT',
      severity: 'error',
      message: `question "${id}": answer must be an object.`,
      detail: id,
    });
    return;
  }
  const a = answer as Record<string, unknown>;
  const t = a.type;
  if (typeof t !== 'string' || !CANON_ANSWER_TYPES.has(t)) {
    findings.push({
      code: 'CANON_ANSWER_BAD_TYPE',
      severity: 'error',
      message: `question "${id}": answer.type must be one of ${[...CANON_ANSWER_TYPES].join(', ')}.`,
      detail: id,
    });
    return;
  }
  const hasOpts = Array.isArray(a.options) && a.options.length > 0 && a.options.every(x => typeof x === 'string');
  const ref = typeof a.optionsRef === 'string' && a.optionsRef.trim() !== '' ? a.optionsRef.trim() : '';
  if (t === 'single_select' || t === 'multi_select') {
    const hasRef = ref.length > 0;
    if ((hasOpts && hasRef) || (!hasOpts && !hasRef)) {
      findings.push({
        code: 'CANON_ANSWER_SELECT_XOR',
        severity: 'error',
        message: `question "${id}": ${t} must have exactly one of options (non-empty string[]) or optionsRef.`,
        detail: id,
      });
    }
    if (ref) {
      const cat = optionCatalogs?.[ref];
      if (!Array.isArray(cat) || !cat.every(x => typeof x === 'string') || cat.length === 0) {
        findings.push({
          code: 'CANON_ANSWER_BAD_OPTIONS_REF',
          severity: 'error',
          message: `question "${id}": optionsRef "${ref}" must name a non-empty string array in optionCatalogs.`,
          detail: id,
        });
      }
    }
  } else {
    if ('options' in a || 'optionsRef' in a) {
      findings.push({
        code: 'CANON_ANSWER_EXTRA_OPTIONS',
        severity: 'error',
        message: `question "${id}": answer type "${t}" must not set options/optionsRef.`,
        detail: id,
      });
    }
  }
  if (t === 'text' || t === 'textarea') {
    if ('maxLength' in a) {
      const m = a.maxLength;
      if (typeof m !== 'number' || !Number.isInteger(m) || m < 1 || m > BRIEF_ANSWER_STRING_MAX) {
        findings.push({
          code: 'CANON_ANSWER_BAD_MAX_LENGTH',
          severity: 'error',
          message: `question "${id}": maxLength must be an integer 1..${BRIEF_ANSWER_STRING_MAX} for text/textarea.`,
          detail: id,
        });
      }
    }
    if ('minLength' in a) {
      const m = a.minLength;
      if (typeof m !== 'number' || !Number.isInteger(m) || m < 0) {
        findings.push({
          code: 'CANON_ANSWER_BAD_MIN_LENGTH',
          severity: 'error',
          message: `question "${id}": minLength must be a non-negative integer when set.`,
          detail: id,
        });
      }
    }
  }
  if (t === 'scale') {
    const lo = a.scaleMin;
    const hi = a.scaleMax;
    if (typeof lo !== 'number' || typeof hi !== 'number' || !Number.isInteger(lo) || !Number.isInteger(hi) || lo >= hi) {
      findings.push({
        code: 'CANON_ANSWER_BAD_SCALE',
        severity: 'error',
        message: `question "${id}": scale requires integer scaleMin < scaleMax.`,
        detail: id,
      });
    }
  }
}

/**
 * question-bank.v1.json: only known keys per question row; every row must have a unique non-empty `reportUse` (ADR Phase E).
 */
export function lintCanonQuestionMetadataKeys(bankRoot: unknown = questionBankCanon): LintFinding[] {
  const findings: LintFinding[] = [];
  try {
    const raw = bankRoot as {
      version?: unknown;
      optionCatalogs?: unknown;
      questions?: Array<Record<string, unknown>>;
    };
    for (const key of Object.keys(raw)) {
      if (!CANON_BANK_ROOT_KEYS.has(key)) {
        findings.push({
          code: 'CANON_UNKNOWN_ROOT_KEY',
          severity: 'error',
          message: `question-bank.v1.json has unknown root key "${key}".`,
          detail: key,
        });
      }
    }
    if (typeof raw.version !== 'string' || raw.version.trim() === '') {
      findings.push({
        code: 'CANON_MISSING_VERSION',
        severity: 'error',
        message: 'question-bank.v1.json must declare a non-empty string version.',
      });
    }
    let optionCatalogs: Record<string, unknown> | undefined;
    if (raw.optionCatalogs !== undefined) {
      if (raw.optionCatalogs === null || typeof raw.optionCatalogs !== 'object' || Array.isArray(raw.optionCatalogs)) {
        findings.push({
          code: 'CANON_BAD_OPTION_CATALOGS',
          severity: 'error',
          message: 'question-bank.v1.json optionCatalogs must be an object of string arrays.',
        });
      } else {
        optionCatalogs = raw.optionCatalogs as Record<string, unknown>;
        for (const [ck, val] of Object.entries(optionCatalogs)) {
          if (!Array.isArray(val) || !val.every(x => typeof x === 'string')) {
            findings.push({
              code: 'CANON_BAD_OPTION_CATALOG_ENTRY',
              severity: 'error',
              message: `optionCatalogs."${ck}" must be an array of strings.`,
              detail: ck,
            });
          }
        }
      }
    }
    const rows = raw.questions ?? [];
    if (!Array.isArray(rows)) {
      findings.push({
        code: 'CANON_QUESTIONS_NOT_ARRAY',
        severity: 'error',
        message: 'question-bank.v1.json questions must be an array.',
      });
      return findings;
    }
    const reportUseFirstId = new Map<string, string>();
    for (const q of rows) {
      const id = typeof q.id === 'string' ? q.id : '?';
      for (const key of Object.keys(q)) {
        if (!CANON_QUESTION_JSON_KEYS.has(key)) {
          findings.push({
            code: 'CANON_UNKNOWN_QUESTION_KEY',
            severity: 'error',
            message: `question-bank.v1.json question "${id}" has unknown key "${key}" (extend CANON_QUESTION_JSON_KEYS in canon-constants if intentional).`,
            detail: id,
          });
        }
      }
      lintCanonOptionalQuestionMetadata(id, q, findings);
      if (!('answer' in q) || q.answer == null) {
        findings.push({
          code: 'CANON_MISSING_ANSWER',
          severity: 'error',
          message: `question "${id}" must declare an answer object (canon contract).`,
          detail: id,
        });
      } else {
        lintCanonAnswerObject(id, q.answer, optionCatalogs, findings);
      }
      const ru = q.reportUse;
      if (typeof ru !== 'string' || ru.trim() === '') {
        findings.push({
          code: 'CANON_MISSING_REPORT_USE',
          severity: 'error',
          message: `question "${id}" must declare a non-empty reportUse string (unique anchor tag for derivedFacts.reportAnchors).`,
          detail: id,
        });
        continue;
      }
      const tag = ru.trim();
      const first = reportUseFirstId.get(tag);
      if (first !== undefined && first !== id) {
        findings.push({
          code: 'CANON_DUPLICATE_REPORT_USE',
          severity: 'error',
          message: `reportUse tag "${tag}" is reused by "${id}" and "${first}" (anchors would collide in plan-derived).`,
          detail: `${tag}:${id}`,
        });
      } else {
        reportUseFirstId.set(tag, id);
      }
    }
  } catch (e) {
    findings.push({
      code: 'CANON_BANK_JSON_READ',
      severity: 'error',
      message: `Could not lint question-bank.v1.json: ${(e as Error).message}`,
    });
  }
  return findings;
}
