import { describe, expect, it } from 'vitest';

import { getQuestionBankReportUse } from '../intake/question-bank.js';

describe('question-bank reportUse (ADR Phase E)', () => {
  it('exposes reportUse for seeded ids', () => {
    expect(getQuestionBankReportUse('a1')).toBe('recon_company_summary');
    expect(getQuestionBankReportUse('a2')).toBe('recon_industry_segment');
    expect(getQuestionBankReportUse('a5')).toBe('segment_website_presence');
    expect(getQuestionBankReportUse('b3')).toBe('marketing_value_promise');
    expect(getQuestionBankReportUse('c5')).toBe('ux_primary_site_goal');
    expect(getQuestionBankReportUse('f1')).toBe('strategy_pain_anchor');
  });

  it('returns undefined when absent', () => {
    expect(getQuestionBankReportUse('a3')).toBeUndefined();
  });
});
