/**
 * Phase 3 — bank / policy static lint (CI).
 */
import { describe, expect, it } from 'vitest';

import { lintBankAndPolicyAll } from '../intake/core/lint-bank-policy.js';

describe('intake bank + policy lint', () => {
  it('reports no errors (warnings allowed)', () => {
    const findings = lintBankAndPolicyAll();
    const errors = findings.filter(f => f.severity === 'error');
    if (errors.length > 0) {
      console.error(errors.map(e => `${e.code}: ${e.message}`).join('\n'));
    }
    expect(errors).toEqual([]);
  });
});
