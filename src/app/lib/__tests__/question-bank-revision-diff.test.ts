import { describe, expect, it } from 'vitest';
import {
  diffQuestionBankIdSets,
  diffQuestionBankJson,
  extractQuestionIdsFromBankJson,
} from '../question-bank-revision-diff';

describe('question-bank-revision-diff', () => {
  it('extracts ids from bank-shaped JSON', () => {
    const ids = extractQuestionIdsFromBankJson({
      version: '1.0.0',
      questions: [{ id: 'b2', priority: 'required' }, { id: 'a1', priority: 'recommended' }],
    });
    expect(ids).toEqual(['a1', 'b2']);
  });

  it('throws on invalid shape', () => {
    expect(() => extractQuestionIdsFromBankJson(null)).toThrow();
    expect(() => extractQuestionIdsFromBankJson({})).toThrow();
    expect(() => extractQuestionIdsFromBankJson({ questions: [{}] })).toThrow();
  });

  it('diffs id sets', () => {
    const d = diffQuestionBankIdSets(['a', 'b', 'c'], ['b', 'c', 'd']);
    expect(d.added).toEqual(['d']);
    expect(d.removed).toEqual(['a']);
    expect(d.unchanged).toEqual(['b', 'c']);
  });

  it('diffQuestionBankJson compares two revisions', () => {
    const d = diffQuestionBankJson(
      { questions: [{ id: 'x', priority: 'optional' }] },
      { questions: [{ id: 'x', priority: 'optional' }, { id: 'y', priority: 'required' }] },
    );
    expect(d.added).toEqual(['y']);
    expect(d.removed).toEqual([]);
    expect(d.unchanged).toEqual(['x']);
  });
});
