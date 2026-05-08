import { describe, expect, it } from 'vitest';
import { PIPELINE_CONSULTANT_REVIEW_POLICY } from '../pipeline-consultant-review-policy.js';

describe('PIPELINE_CONSULTANT_REVIEW_POLICY', () => {
  it('substantive gate matches app PIPELINE_MONITOR_REVIEW_POLICY (see src/app/config/pipeline-monitor-review-policy.ts)', () => {
    expect(PIPELINE_CONSULTANT_REVIEW_POLICY.substantiveNotesCombinedMinTrimChars).toBe(16);
  });
});
