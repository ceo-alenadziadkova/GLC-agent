import { describe, expect, it } from 'vitest';

import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';
import {
  getBranchDepsCacheStats,
  listBankStubIdsInvalidatedByResponseKeys,
  resetBranchDepsCacheStats,
} from '@glc/intake-core';
import { evaluateCanonEligibility } from '@glc/intake-core';

describe('listBankStubIdsInvalidatedByResponseKeys (ADR Phase C2 prep)', () => {
  it('a5 change invalidates website-branch stubs', () => {
    const ids = listBankStubIdsInvalidatedByResponseKeys(['a5']);
    expect(ids).toContain('c5');
    expect(ids).toContain('c_nosite_1');
    expect(ids).toContain('c_nosite_3');
  });

  it('d1 change invalidates CRM-branch stubs', () => {
    const ids = listBankStubIdsInvalidatedByResponseKeys(['d1']);
    expect(ids).toContain('d1a');
    expect(ids).toContain('d1b');
  });

  it('returns sorted unique ids', () => {
    const ids = listBankStubIdsInvalidatedByResponseKeys(['a5', 'a5']);
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('reuses dependency map cache for non-v1 stub slices', () => {
    resetBranchDepsCacheStats();
    const nonV1Slice = QUESTION_BANK_V1_STUBS.slice();
    listBankStubIdsInvalidatedByResponseKeys(['a5'], nonV1Slice);
    listBankStubIdsInvalidatedByResponseKeys(['d1'], nonV1Slice);
    const stats = getBranchDepsCacheStats();
    expect(stats.responseDepsBuilds).toBe(1);
  });

  it('reuses eval-order cache for non-v1 stub slices', () => {
    resetBranchDepsCacheStats();
    const nonV1Slice = QUESTION_BANK_V1_STUBS.slice();
    evaluateCanonEligibility(nonV1Slice, { a5: 'no_website' });
    evaluateCanonEligibility(nonV1Slice, { a5: 'Yes, multi-page site' });
    const stats = getBranchDepsCacheStats();
    expect(stats.evalOrderBuilds).toBe(1);
  });
});
