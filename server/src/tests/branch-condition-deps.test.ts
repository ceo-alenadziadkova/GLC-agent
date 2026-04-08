import { describe, expect, it } from 'vitest';

import { BRANCH_RULES } from '../intake/branch-rules.js';
import { BRANCH_RULE_RESPONSE_KEYS } from '../intake/core/branch-condition-deps.js';

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
