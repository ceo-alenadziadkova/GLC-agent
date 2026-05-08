/**
 * intake-brief.ts participation sets stay aligned with intake-policy.v1.json.
 */
import { describe, expect, it } from 'vitest';

import { INTAKE_POLICY_V1, PRE_BRIEF_BANK_INCLUDED_IDS } from '@glc/intake-core';
import {
  INTAKE_IDENTITY_FIELD_IDS,
  PRE_BRIEF_PARTICIPATION_IDS,
  PRE_BRIEF_REQUIRED_SUBMIT_IDS,
} from '../schemas/intake-brief.js';

describe('intake-brief vs intake-policy', () => {
  it('PRE_BRIEF_PARTICIPATION_IDS bank slice matches pre_brief.bankIncluded', () => {
    const identity = new Set<string>(INTAKE_IDENTITY_FIELD_IDS);
    const nonBank = new Set<string>([...identity]);
    const bankOnly = [...PRE_BRIEF_PARTICIPATION_IDS].filter(id => !nonBank.has(id)).sort();
    const fromPolicy = [...(INTAKE_POLICY_V1.modes.pre_brief.bankIncluded ?? [])].sort();
    expect(bankOnly).toEqual(fromPolicy);
    expect([...PRE_BRIEF_BANK_INCLUDED_IDS].sort()).toEqual(fromPolicy);
  });

  it('PRE_BRIEF_REQUIRED_SUBMIT_IDS is express SLA intersected with pre_brief.bankIncluded', () => {
    const bank = new Set(INTAKE_POLICY_V1.modes.pre_brief.bankIncluded ?? []);
    const expected = [
      ...INTAKE_POLICY_V1.modes.express.requiredAlways.filter(id => bank.has(id)),
      ...INTAKE_POLICY_V1.modes.express.requiredIfVisible.filter(id => bank.has(id)),
    ];
    expect([...PRE_BRIEF_REQUIRED_SUBMIT_IDS]).toEqual(expected);
  });
});
