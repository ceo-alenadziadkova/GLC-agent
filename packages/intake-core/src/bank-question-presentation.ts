/**
 * Label, hint, control type, and options from `question-bank.v1.json` + `bank-question-ui-overrides.ts`.
 * Shared by Discovery wizard and classic brief catalog (`intake-brief-catalog-meta.ts`).
 */
import type { BriefQuestion } from './audit-contract.js';
import { getBankQuestionUiOverride } from './bank-question-ui-overrides.js';
import { appendUniversalIntakeChoiceEscapes } from './intake-universal-choice-escapes.js';
import {
  expandAnswerContractForApi,
  getQuestionBankAnswerContract,
  getQuestionBankSchemaMeta,
} from './question-bank.js';

function mapContractTypeToBrief(type: string | undefined): BriefQuestion['type'] {
  if (type === 'single_select') return 'single_choice';
  if (type === 'multi_select') return 'multi_choice';
  return 'free_text';
}

export type BriefQuestionStem = Pick<BriefQuestion, 'id' | 'question' | 'hint' | 'type' | 'options'>;

/** Core row for any surface; question `id` is the bank id (persisted response key). */
export function buildBriefQuestionStemFromBankId(bankId: string): BriefQuestionStem {
  const meta = getQuestionBankSchemaMeta(bankId);
  if (!meta) {
    throw new Error(`question bank: unknown id "${bankId}"`);
  }

  const override = getBankQuestionUiOverride(bankId);
  const contract = getQuestionBankAnswerContract(bankId);
  const expanded = contract ? expandAnswerContractForApi(contract) : undefined;

  const briefType = override?.type ?? mapContractTypeToBrief(expanded?.type);

  let options: string[] | undefined;
  if (briefType === 'single_choice' || briefType === 'multi_choice') {
    if (override?.options?.length) {
      options = appendUniversalIntakeChoiceEscapes(override.options);
    } else if (expanded?.type === 'single_select' || expanded?.type === 'multi_select') {
      const o = expanded.options;
      if (o?.length) options = appendUniversalIntakeChoiceEscapes(o);
    }
  }

  return {
    id: bankId,
    question: meta.label,
    hint: override?.hint,
    type: briefType,
    ...(options ? { options } : {}),
  };
}
