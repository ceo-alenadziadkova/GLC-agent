import { describe, expect, it } from 'vitest';

import { lintSequencingPilotGuardrails } from '../core/lint-bank-policy/lint-sequencing-pilot-guardrails.js';

describe('lintSequencingPilotGuardrails', () => {
  it('reports no errors for sequencing pilot guardrails', () => {
    const findings = lintSequencingPilotGuardrails();
    const errors = findings.filter(f => f.severity === 'error');
    expect(errors).toEqual([]);
  });
});
