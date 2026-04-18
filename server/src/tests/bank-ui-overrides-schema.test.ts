import { describe, expect, it } from 'vitest';
import { listBankQuestionUiOverrideIds } from '@glc/intake-core';
import { QUESTION_BANK_V1_IDS } from '@glc/intake-core';

describe('bank-question-ui-overrides', () => {
  it('every override key exists in question-bank v1', () => {
    for (const id of listBankQuestionUiOverrideIds()) {
      expect(QUESTION_BANK_V1_IDS.has(id), `override id ${id} not in question-bank.v1.json`).toBe(true);
    }
  });
});
