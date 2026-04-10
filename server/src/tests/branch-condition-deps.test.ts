import { describe, expect, it } from 'vitest';

import { BRANCH_RULES } from '@glc/intake-core';
import {
  BRANCH_RULE_RESPONSE_KEYS,
  buildBranchAwareStubEvalOrder,
} from '@glc/intake-core';
import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';

describe('BRANCH_RULE_RESPONSE_KEYS', () => {
  it('covers every BRANCH_RULES key (add deps when introducing a predicate)', () => {
    for (const key of Object.keys(BRANCH_RULES)) {
      expect(BRANCH_RULE_RESPONSE_KEYS[key], `missing deps for ${key}`).toBeDefined();
      expect(BRANCH_RULE_RESPONSE_KEYS[key]!.length).toBeGreaterThan(0);
    }
  });

  it('has no orphan keys outside BRANCH_RULES', () => {
    for (const key of Object.keys(BRANCH_RULE_RESPONSE_KEYS)) {
      expect(BRANCH_RULES[key], `orphan deps key ${key}`).toBeDefined();
    }
  });
});

describe('buildBranchAwareStubEvalOrder', () => {
  function indexOfId(order: { id: string }[], id: string): number {
    return order.findIndex(s => s.id === id);
  }

  it('permutes stubs and stays acyclic for the v1 bank', () => {
    const order = buildBranchAwareStubEvalOrder(QUESTION_BANK_V1_STUBS);
    expect(order).toHaveLength(QUESTION_BANK_V1_STUBS.length);
    const ids = order.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of QUESTION_BANK_V1_STUBS) {
      expect(ids).toContain(s.id);
    }
  });

  it('places branch inputs before dependents (website, no-site social, CRM)', () => {
    const order = buildBranchAwareStubEvalOrder(QUESTION_BANK_V1_STUBS);
    expect(indexOfId(order, 'a5')).toBeLessThan(indexOfId(order, 'c5'));
    expect(indexOfId(order, 'c_nosite_1')).toBeLessThan(indexOfId(order, 'c_nosite_3'));
    expect(indexOfId(order, 'd1')).toBeLessThan(indexOfId(order, 'd1a'));
    expect(indexOfId(order, 'a2')).toBeLessThan(indexOfId(order, 'b_hotel_1'));
    expect(indexOfId(order, 'a4')).toBeLessThan(indexOfId(order, 'd4'));
  });
});
