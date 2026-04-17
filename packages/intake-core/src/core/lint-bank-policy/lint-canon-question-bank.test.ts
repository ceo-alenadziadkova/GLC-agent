import { describe, expect, it } from 'vitest';

import { lintCanonQuestionMetadataKeys } from './lint-canon-question-bank.js';

describe('lintCanonQuestionMetadataKeys', () => {
  it('returns no findings for a minimal valid bank snapshot', () => {
    const bank = {
      version: 'test-1',
      questions: [
        {
          id: 'q_test_1',
          section: 'general',
          priority: 'optional',
          label: 'Test',
          reportUse: 'test_report_use_anchor',
          answer: { type: 'boolean' as const },
        },
      ],
    };
    expect(lintCanonQuestionMetadataKeys(bank)).toEqual([]);
  });

  it('flags unknown root keys', () => {
    const bank = {
      version: 'test-1',
      extraRoot: true,
      questions: [],
    };
    const codes = lintCanonQuestionMetadataKeys(bank).map(f => f.code);
    expect(codes).toContain('CANON_UNKNOWN_ROOT_KEY');
  });

  it('flags duplicate reportUse tags', () => {
    const bank = {
      version: 'test-1',
      questions: [
        {
          id: 'a',
          label: 'A',
          reportUse: 'dup_tag',
          answer: { type: 'boolean' as const },
        },
        {
          id: 'b',
          label: 'B',
          reportUse: 'dup_tag',
          answer: { type: 'boolean' as const },
        },
      ],
    };
    expect(lintCanonQuestionMetadataKeys(bank).some(f => f.code === 'CANON_DUPLICATE_REPORT_USE')).toBe(true);
  });

  it('flags unknown question keys', () => {
    const bank = {
      version: 'test-1',
      questions: [
        {
          id: 'q1',
          label: 'L',
          reportUse: 'ru1',
          answer: { type: 'boolean' as const },
          notARealCanonField: 1,
        },
      ],
    };
    expect(lintCanonQuestionMetadataKeys(bank).some(f => f.code === 'CANON_UNKNOWN_QUESTION_KEY')).toBe(true);
  });
});
