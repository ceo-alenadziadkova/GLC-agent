/**
 * Wizard UI copy/options — loaded from `bank-question-ui-overrides.v1.json` (canon).
 * Industry list for `a2` uses `optionsRef: "industry"` → `question-bank.v1.json` `optionCatalogs`.
 */
import type { BriefQuestion } from './audit-contract.js';
import { BRIEF_ANSWER_STRING_MAX } from './brief-answer-limits.js';
import { QUESTION_BANK_OPTION_CATALOGS } from './question-bank.js';
import type { IntakeAnswerContract } from './types.js';
import raw from './bank-question-ui-overrides.v1.json' with { type: 'json' };

export type BankQuestionUiOverride = {
  type?: BriefQuestion['type'];
  options?: string[];
  hint?: string;
};

type RawOverrideRow = {
  type?: BriefQuestion['type'];
  options?: string[];
  /** Resolves to `QUESTION_BANK_OPTION_CATALOGS[optionsRef]` at runtime. */
  optionsRef?: string;
  hint?: string;
};

const OVERRIDES_RAW = raw.overrides as Record<string, RawOverrideRow>;

function resolveOverride(id: string): BankQuestionUiOverride | undefined {
  const row = OVERRIDES_RAW[id];
  if (!row) return undefined;
  if (row.optionsRef) {
    const cat = QUESTION_BANK_OPTION_CATALOGS[row.optionsRef];
    if (!cat?.length) {
      throw new Error(`bank UI overrides: missing catalog "${row.optionsRef}" for "${id}"`);
    }
    return { type: row.type, hint: row.hint, options: [...cat] };
  }
  return { type: row.type, options: row.options, hint: row.hint };
}

export function getBankQuestionUiOptions(id: string): readonly string[] | undefined {
  return resolveOverride(id)?.options;
}

export function getBankQuestionUiOverride(id: string): BankQuestionUiOverride | undefined {
  return resolveOverride(id);
}

export function listBankQuestionUiOverrideIds(): string[] {
  return Object.keys(OVERRIDES_RAW).sort();
}

/**
 * Build canon `answer` metadata for `question-bank.v1.json` (kept in sync with wizard UI overrides).
 */
export function buildCanonAnswerContractForBankId(id: string): IntakeAnswerContract {
  const row = OVERRIDES_RAW[id];
  if (!row || row.type === 'free_text' || row.type === undefined) {
    return { type: 'textarea', maxLength: BRIEF_ANSWER_STRING_MAX };
  }
  if (row.type === 'single_choice') {
    if (row.optionsRef) {
      return { type: 'single_select', optionsRef: row.optionsRef };
    }
    const opts = row.options;
    if (!opts?.length) {
      throw new Error(`bank UI override: single_choice missing options for "${id}"`);
    }
    return { type: 'single_select', options: [...opts] };
  }
  if (row.type === 'multi_choice') {
    const opts = row.options;
    if (!opts?.length) {
      throw new Error(`bank UI override: multi_choice missing options for "${id}"`);
    }
    return { type: 'multi_select', options: [...opts] };
  }
  return { type: 'textarea', maxLength: BRIEF_ANSWER_STRING_MAX };
}
