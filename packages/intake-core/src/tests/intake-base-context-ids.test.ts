import { describe, expect, it } from 'vitest';

import { INTAKE_MINIMUM_CONTEXT_BANK_IDS, isIntakeMinimumContextBankId } from '../intake-base-context-ids.js';
import { PRE_BRIEF_PARTICIPATION_IDS } from '../intake-brief-catalog-meta.js';

describe('intake-base-context-ids', () => {
  it('has no duplicate ids in order', () => {
    const set = new Set(INTAKE_MINIMUM_CONTEXT_BANK_IDS);
    expect(set.size).toBe(INTAKE_MINIMUM_CONTEXT_BANK_IDS.length);
  });

  it('matches pre-brief participation set (policy source)', () => {
    const fromPolicy = new Set(PRE_BRIEF_PARTICIPATION_IDS);
    expect(new Set(INTAKE_MINIMUM_CONTEXT_BANK_IDS)).toEqual(fromPolicy);
  });

  it('isIntakeMinimumContextBankId is consistent with the list', () => {
    for (const id of INTAKE_MINIMUM_CONTEXT_BANK_IDS) {
      expect(isIntakeMinimumContextBankId(id)).toBe(true);
    }
    expect(isIntakeMinimumContextBankId('c5')).toBe(false);
  });
});
