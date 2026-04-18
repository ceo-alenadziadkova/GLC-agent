import { describe, expect, it } from 'vitest';
import { INTAKE_REVENUE_BANK_ID, PRE_BRIEF_BANK_INCLUDED_IDS, choiceSpecifyResponseKey } from '@glc/intake-core';

import { buildPreBriefMergeKeySet } from '../services/intake/intake-prebrief-merge.service.js';

describe('pre-brief merge whitelist (choice specify keys)', () => {
  it('includes f1__other and intake_industry_specify for policy bankIncluded + identity (c3 not in pre_brief slice)', () => {
    const keys = buildPreBriefMergeKeySet(PRE_BRIEF_BANK_INCLUDED_IDS);
    expect(keys.has('f1__other')).toBe(true);
    expect(keys.has('c3__other')).toBe(false);
    expect(keys.has('intake_industry_specify')).toBe(true);
    expect(keys.has(choiceSpecifyResponseKey(INTAKE_REVENUE_BANK_ID))).toBe(true);
  });
});
