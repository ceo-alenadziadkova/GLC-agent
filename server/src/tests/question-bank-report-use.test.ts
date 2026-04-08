import { describe, expect, it } from 'vitest';

import { getQuestionBankReportUse } from '../intake/question-bank.js';

describe('question-bank reportUse (ADR Phase E)', () => {
  it('exposes reportUse for seeded ids', () => {
    expect(getQuestionBankReportUse('a1')).toBe('recon_company_summary');
    expect(getQuestionBankReportUse('f1')).toBe('strategy_pain_anchor');
  });

  it('returns undefined when absent', () => {
    expect(getQuestionBankReportUse('a2')).toBeUndefined();
  });
});
