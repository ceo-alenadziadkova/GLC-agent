/**
 * Every question-bank v1 stub must resolve through bankQuestionUiCatalog (ADR Phase A — wizard copy path).
 */
import { describe, expect, it } from 'vitest';
import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';
import { bankIdToBriefQuestion } from './bankQuestionUiCatalog';

describe('bankQuestionUiCatalog vs question-bank.v1.json', () => {
  it('produces a non-empty label for every stub id', () => {
    for (const stub of QUESTION_BANK_V1_STUBS) {
      const q = bankIdToBriefQuestion(stub.id, stub.priority);
      expect(q.id).toBe(stub.id);
      expect(q.question.trim().length, stub.id).toBeGreaterThan(0);
      expect(['free_text', 'single_choice', 'multi_choice', 'number', 'rating', 'confirm']).toContain(q.type);
    }
  });
});
