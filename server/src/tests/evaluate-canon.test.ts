import { describe, expect, it } from 'vitest';

import { evaluateCanonEligibility } from '@glc/intake-core';
import { evalBranchCondition } from '@glc/intake-core';
import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';
import type { IntakeResponsesMap } from '@glc/intake-core';

import { INTAKE_PLAN_FIXTURES } from './fixtures/intake-plan-fixtures.js';

describe('evaluateCanonEligibility', () => {
  it('eligible ids match per-stub evalBranchCondition', () => {
    for (const f of INTAKE_PLAN_FIXTURES) {
      const r = f.responses as IntakeResponsesMap;
      const { eligibleIds } = evaluateCanonEligibility(QUESTION_BANK_V1_STUBS, r);
      const expected = QUESTION_BANK_V1_STUBS.filter(q => evalBranchCondition(q.branchCondition, r)).map(
        q => q.id,
      );
      expect(eligibleIds).toEqual(expected);
    }
  });
});
