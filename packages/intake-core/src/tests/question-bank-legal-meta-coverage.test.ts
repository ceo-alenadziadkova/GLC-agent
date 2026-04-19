import { describe, it, expect } from 'vitest';
import raw from '../question-bank.v1.json' with { type: 'json' };
import { getQuestionBankLegalMetaForBankId, listQuestionBankIdsWithLegalMeta } from '../question-bank-legal-meta.v1.js';

describe('question-bank-legal-meta coverage', () => {
  it('defines legal meta for every bank question id', () => {
    const bankIds = new Set(raw.questions.map(q => q.id));
    const legalIds = new Set(listQuestionBankIdsWithLegalMeta());
    expect(legalIds).toEqual(bankIds);
  });

  it('returns merged defaults and overrides', () => {
    const a10 = getQuestionBankLegalMetaForBankId('a10');
    expect(a10?.sensitive).toBe(true);
    expect(a10?.legal_basis).toBe('contract');
    const a1 = getQuestionBankLegalMetaForBankId('a1');
    expect(a1?.sensitive).toBe(false);
  });
});
