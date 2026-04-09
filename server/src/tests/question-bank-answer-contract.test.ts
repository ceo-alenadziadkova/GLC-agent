import { describe, expect, it } from 'vitest';

import {
  expandAnswerContractForApi,
  getQuestionBankAnswerContract,
  QUESTION_BANK_OPTION_CATALOGS,
} from '../intake/question-bank.js';

describe('question-bank answer contract (ADR canon)', () => {
  it('exposes textarea default for free-text rows', () => {
    const a = getQuestionBankAnswerContract('a1');
    expect(a?.type).toBe('textarea');
    expect(a?.maxLength).toBe(12_000);
  });

  it('uses optionsRef for industry and expands for API', () => {
    const a = getQuestionBankAnswerContract('a2');
    expect(a?.type).toBe('single_select');
    expect(a?.optionsRef).toBe('industry');
    expect(a?.options).toBeUndefined();
    const expanded = expandAnswerContractForApi(a!);
    expect(expanded.optionsRef).toBeUndefined();
    expect(expanded.options?.length).toBe(QUESTION_BANK_OPTION_CATALOGS.industry.length);
  });

  it('inlines options for single_select without catalog ref', () => {
    const a = getQuestionBankAnswerContract('a5');
    expect(a?.type).toBe('single_select');
    expect(a?.options?.length).toBeGreaterThan(1);
  });
});
