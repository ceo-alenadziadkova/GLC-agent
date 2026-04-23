import { describe, expect, it } from 'vitest';

import { getIntakeIntelligenceContract } from '../config/intake-intelligence-contract.js';
import { QUESTION_BANK_V1_IDS } from '../question-bank.js';

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

describe('intelligence review cadence governance', () => {
  it('keeps reviewByIsoDate non-overdue for all contracts with stewardship/todo', () => {
    const today = isoToday();
    const overdue: string[] = [];
    for (const questionId of QUESTION_BANK_V1_IDS) {
      const contract = getIntakeIntelligenceContract(questionId);
      const review = contract.stewardship?.reviewByIsoDate ?? contract.todo?.reviewByIsoDate;
      if (!review) continue;
      if (review < today) overdue.push(`${questionId}:${review}`);
    }
    expect(overdue).toEqual([]);
  });

  it('requires ownerAlias for governed stewardship records', () => {
    const missingAlias: string[] = [];
    for (const questionId of QUESTION_BANK_V1_IDS) {
      const contract = getIntakeIntelligenceContract(questionId);
      if (!contract.stewardship) continue;
      if (!contract.stewardship.ownerAlias || contract.stewardship.ownerAlias.trim().length === 0) {
        missingAlias.push(questionId);
      }
    }
    expect(missingAlias).toEqual([]);
  });

  it('does not allow product as default intelligence owner domain', () => {
    const productOwned: string[] = [];
    for (const questionId of QUESTION_BANK_V1_IDS) {
      const contract = getIntakeIntelligenceContract(questionId);
      const owner = contract.stewardship?.ownerDomain ?? contract.todo?.ownerDomain;
      if (owner === 'product') {
        productOwned.push(questionId);
      }
    }
    expect(productOwned).toEqual([]);
  });
});
