/**
 * Phase 3 — bank / policy static lint (CI).
 */
import { describe, expect, it } from 'vitest';

import { lintSyntheticCollision } from '@glc/intake-core';
import { lintBankAndPolicyAll } from '@glc/intake-core/lint-node';

describe('intake bank + policy lint', () => {
  it('reports no errors (warnings allowed)', () => {
    const findings = lintBankAndPolicyAll();
    const errors = findings.filter(f => f.severity === 'error');
    if (errors.length > 0) {
      console.error(errors.map(e => `${e.code}: ${e.message}`).join('\n'));
    }
    expect(errors).toEqual([]);
  });

  it('allows canonical revenue bank id in syntheticRequired (no SYNTHETIC_COLLISION)', () => {
    const collisions = lintSyntheticCollision().filter(f => f.code === 'SYNTHETIC_COLLISION');
    expect(collisions).toEqual([]);
  });
});
