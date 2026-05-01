import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  fetchConsultantOwnedAudit: vi.fn(),
  requestMissingDataForPendingReview: vi.fn(),
}));

vi.mock('../repository/pipeline-audit.repository.js', () => ({
  fetchConsultantOwnedAudit: mocks.fetchConsultantOwnedAudit,
}));

vi.mock('../repository/pipeline-review.repository.js', () => ({
  requestMissingDataForPendingReview: mocks.requestMissingDataForPendingReview,
}));

import { runReviewRequestMissingData } from '../use-cases/request-missing-data-review.use-case.js';

describe('runReviewRequestMissingData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns auditNotFound when consultant does not own audit', async () => {
    mocks.fetchConsultantOwnedAudit.mockResolvedValue(null);
    const res = await runReviewRequestMissingData({
      auditId: 'a1',
      userId: 'u1',
      afterPhase: 0,
      consultantNotes: 'need data',
      interviewNotes: null,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.status).toBe(404);
  });

  it('returns missing_data_requested on successful note save', async () => {
    mocks.fetchConsultantOwnedAudit.mockResolvedValue({ id: 'a1' });
    mocks.requestMissingDataForPendingReview.mockResolvedValue({
      data: { id: 'r1', status: 'pending' },
      error: null,
    });
    const res = await runReviewRequestMissingData({
      auditId: 'a1',
      userId: 'u1',
      afterPhase: 0,
      consultantNotes: 'request docs',
      interviewNotes: 'ask ICP details',
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.response.status).toBe('missing_data_requested');
  });
});
