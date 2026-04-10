/**
 * intake-brief.ts participation sets stay aligned with intake-policy.v1.json.
 */
import { describe, expect, it } from 'vitest';

import { INTAKE_POLICY_V1 } from '@glc/intake-core';
import preBriefBankIncluded from '@glc/intake-core/pre-brief-bank-included.json' with { type: 'json' };
import {
  INTAKE_IDENTITY_FIELD_IDS,
  PRE_BRIEF_PARTICIPATION_IDS,
  PRE_BRIEF_REQUIRED_SUBMIT_IDS,
} from '../schemas/intake-brief.js';

describe('intake-brief vs intake-policy', () => {
  it('PRE_BRIEF_PARTICIPATION_IDS bank slice matches pre_brief.bankIncluded plus revenue_model', () => {
    const identity = new Set<string>(INTAKE_IDENTITY_FIELD_IDS);
    const nonBank = new Set<string>([...identity, 'revenue_model']);
    const bankOnly = [...PRE_BRIEF_PARTICIPATION_IDS].filter(id => !nonBank.has(id)).sort();
    const fromPolicy = [...(INTAKE_POLICY_V1.modes.pre_brief.bankIncluded ?? [])].sort();
    expect(bankOnly).toEqual(fromPolicy);
    expect([...(preBriefBankIncluded as string[])].sort()).toEqual(fromPolicy);
  });

  it('PRE_BRIEF_REQUIRED_SUBMIT_IDS matches express requiredAlways + requiredIfVisible', () => {
    expect([...PRE_BRIEF_REQUIRED_SUBMIT_IDS]).toEqual([
      ...INTAKE_POLICY_V1.modes.express.requiredAlways,
      ...INTAKE_POLICY_V1.modes.express.requiredIfVisible,
    ]);
  });
});
