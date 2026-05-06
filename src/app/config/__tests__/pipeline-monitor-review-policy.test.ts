import { describe, expect, it } from 'vitest';
import {
  PIPELINE_MONITOR_REVIEW_POLICY,
  reviewNotesMeetSubstantiveMinimum,
  selectableAutoWingDomainPhasesForReviewRerun,
} from '../pipeline-monitor-review-policy';

describe('pipeline-monitor-review-policy', () => {
  it('reviewNotesMeetSubstantiveMinimum uses combined trimmed length threshold', () => {
    expect(reviewNotesMeetSubstantiveMinimum('', '')).toBe(false);
    expect(reviewNotesMeetSubstantiveMinimum('short', '')).toBe(false);
    const boundary = ''.padEnd(PIPELINE_MONITOR_REVIEW_POLICY.substantiveNotesCombinedMinTrimChars, 'x');
    expect(reviewNotesMeetSubstantiveMinimum(boundary, '')).toBe(true);
    expect(reviewNotesMeetSubstantiveMinimum('hello', `${' '.repeat(20)}world${'x'.repeat(10)}`)).toBe(true);
  });

  it('selectableAutoWingDomainPhasesForReviewRerun caps at auto wing and respects execution plan', () => {
    expect(selectableAutoWingDomainPhasesForReviewRerun(null, 4)).toEqual([1, 2, 3, 4]);
    expect(selectableAutoWingDomainPhasesForReviewRerun(null, 2)).toEqual([1, 2]);

    expect(
      selectableAutoWingDomainPhasesForReviewRerun(
        {
          execution_plan: {
            coverage_package: 'starter',
            selected_domains: ['tech_infrastructure'],
            include_strategy: false,
            depth: 'standard',
          },
        },
        4,
      ),
    ).toEqual([1]);
  });
});
