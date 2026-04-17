import { describe, it, expect } from 'vitest';
import { PIPELINE_QUALITY_GATE_FLAG_SEVERITY_REQUIRING_NOTES } from '../../../config/pipeline-quality-gate-policy.js';
import { qualityGateRequiresConsultantNotes } from '../quality-gate-review.policy.js';

describe('qualityGateRequiresConsultantNotes', () => {
  it('returns false when gate passed', () => {
    expect(
      qualityGateRequiresConsultantNotes({
        passed: true,
        flags: [{ severity: PIPELINE_QUALITY_GATE_FLAG_SEVERITY_REQUIRING_NOTES }],
      }),
    ).toBe(false);
  });

  it('returns true when not passed and a flag matches configured severity', () => {
    expect(
      qualityGateRequiresConsultantNotes({
        passed: false,
        flags: [{ severity: 'info' }, { severity: PIPELINE_QUALITY_GATE_FLAG_SEVERITY_REQUIRING_NOTES }],
      }),
    ).toBe(true);
  });

  it('returns false when not passed but no matching severity', () => {
    expect(
      qualityGateRequiresConsultantNotes({
        passed: false,
        flags: [{ severity: 'info' }],
      }),
    ).toBe(false);
  });
});
