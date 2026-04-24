import { describe, expect, it } from 'vitest';
import { pipelineHasReconCrawlerTruncationWarning } from './pipeline-recon-truncation';
import { RECON_REVIEW_SUMMARY_POLICY } from '../config/recon-review-summary-policy';

describe('pipelineHasReconCrawlerTruncationWarning', () => {
  it('returns true for phase 0 warning with crawler truncation prefix', () => {
    const prefix = RECON_REVIEW_SUMMARY_POLICY.crawlerContextTruncatedMessagePrefix;
    expect(
      pipelineHasReconCrawlerTruncationWarning([
        {
          phase: 0,
          event_type: 'warning',
          message: `${prefix} crawler`,
        },
      ]),
    ).toBe(true);
  });

  it('returns false for warnings on other phases', () => {
    const prefix = RECON_REVIEW_SUMMARY_POLICY.crawlerContextTruncatedMessagePrefix;
    expect(
      pipelineHasReconCrawlerTruncationWarning([
        {
          phase: 1,
          event_type: 'warning',
          message: `${prefix} crawler`,
        },
      ]),
    ).toBe(false);
  });

  it('returns false when message does not match prefix', () => {
    expect(
      pipelineHasReconCrawlerTruncationWarning([
        {
          phase: 0,
          event_type: 'warning',
          message: 'Something else',
        },
      ]),
    ).toBe(false);
  });
});
