import { describe, expect, it } from 'vitest';

import { lintCriticalSignalRegistry } from '../core/lint-bank-policy/lint-critical-signals-registry.js';

describe('lintCriticalSignalRegistry', () => {
  it('reports no errors for pilot registry', () => {
    const findings = lintCriticalSignalRegistry();
    const errors = findings.filter(f => f.severity === 'error');
    expect(errors).toEqual([]);
  });
});
