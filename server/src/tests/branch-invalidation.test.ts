import { describe, expect, it } from 'vitest';

import { listBankStubIdsInvalidatedByResponseKeys } from '../intake/core/branch-condition-deps.js';

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
});
