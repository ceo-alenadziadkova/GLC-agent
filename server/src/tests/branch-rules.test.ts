import { describe, expect, it } from 'vitest';

import { evalBranchCondition } from '../intake/branch-rules.js';

describe('evalBranchCondition', () => {
  it('fails closed for unknown branch keys', () => {
    const visible = evalBranchCondition('unknown_branch_key_typo', {});
    expect(visible).toBe(false);
  });

  it('keeps default visible behavior when no branch is set', () => {
    expect(evalBranchCondition(undefined, {})).toBe(true);
  });
});
