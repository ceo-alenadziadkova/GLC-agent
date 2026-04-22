import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendApiErrorMock = vi.hoisted(() => vi.fn());
const enqueueMock = vi.hoisted(() => vi.fn());
const getStatusMock = vi.hoisted(() => vi.fn());
const isDirectorDeepDiveOnDemandEnabledMock = vi.hoisted(() => vi.fn(() => true));

vi.mock('../config/feature-flags.js', () => ({
  isDirectorDeepDiveOnDemandEnabled: isDirectorDeepDiveOnDemandEnabledMock,
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

vi.mock('../services/orchestration/run-director-deep-dive.service.js', () => ({
  enqueueDirectorDeepDive: enqueueMock,
  getDirectorDeepDiveJobStatus: getStatusMock,
}));

function createRes() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  return { status, json };
}

describe('director deep-dive controllers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDirectorDeepDiveOnDemandEnabledMock.mockReturnValue(true);
  });

  it('post maps quota_exceeded to 409 API error', async () => {
    enqueueMock.mockResolvedValue({ status: 'quota_exceeded' });
    const { postDirectorDeepDiveController } = await import('../routes/audits/controllers/post-director-deep-dive.controller.js');
    const res = createRes();
    await postDirectorDeepDiveController({
      params: { id: '00000000-0000-4000-8000-000000000001', domain: 'marketing_utp' },
      body: {
        client_context: { goals: ['Grow'], constraints: [] },
        idempotency_key: 'idem-key-1',
      },
      userId: 'user-1',
    } as never, res as never);
    expect(sendApiErrorMock).toHaveBeenCalledWith(
      res,
      409,
      'DIRECTOR_DEEP_DIVE_QUOTA_EXCEEDED',
      'quota_exceeded',
    );
  });

  it('post maps token_budget_exceeded to 409 API error', async () => {
    enqueueMock.mockResolvedValue({ status: 'token_budget_exceeded' });
    const { postDirectorDeepDiveController } = await import('../routes/audits/controllers/post-director-deep-dive.controller.js');
    const res = createRes();
    await postDirectorDeepDiveController({
      params: { id: '00000000-0000-4000-8000-000000000001', domain: 'marketing_utp' },
      body: {
        client_context: { goals: ['Grow'], constraints: [] },
        idempotency_key: 'idem-key-1',
      },
      userId: 'user-1',
    } as never, res as never);
    expect(sendApiErrorMock).toHaveBeenCalledWith(
      res,
      409,
      'DIRECTOR_DEEP_DIVE_TOKEN_BUDGET_EXCEEDED',
      'token_budget_exceeded',
    );
  });

  it('post maps idempotency mismatch to 409 API error', async () => {
    enqueueMock.mockResolvedValue({ status: 'idempotency_mismatch' });
    const { postDirectorDeepDiveController } = await import('../routes/audits/controllers/post-director-deep-dive.controller.js');
    const res = createRes();
    await postDirectorDeepDiveController({
      params: { id: '00000000-0000-4000-8000-000000000001', domain: 'marketing_utp' },
      body: {
        client_context: { goals: ['Grow'], constraints: [] },
        idempotency_key: 'idem-key-1',
      },
      userId: 'user-1',
    } as never, res as never);
    expect(sendApiErrorMock).toHaveBeenCalledWith(
      res,
      409,
      'IDEMPOTENCY_PAYLOAD_MISMATCH',
      'idempotency_payload_mismatch',
    );
  });

  it('post returns 202 when job queued', async () => {
    enqueueMock.mockResolvedValue({ status: 'queued', job_id: 'job-1' });
    const { postDirectorDeepDiveController } = await import('../routes/audits/controllers/post-director-deep-dive.controller.js');
    const res = createRes();
    await postDirectorDeepDiveController({
      params: { id: '00000000-0000-4000-8000-000000000001', domain: 'marketing_utp' },
      body: {
        client_context: { goals: ['Grow'], constraints: [] },
        idempotency_key: 'idem-key-1',
      },
      userId: 'user-1',
    } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(202);
  });

  it('get returns 503 when feature is disabled', async () => {
    isDirectorDeepDiveOnDemandEnabledMock.mockReturnValue(false);
    const { getDirectorDeepDiveStatusController } = await import('../routes/audits/controllers/get-director-deep-dive-status.controller.js');
    const res = createRes();
    await getDirectorDeepDiveStatusController({
      params: { id: 'audit-1', domain: 'marketing_utp', jobId: 'job-1' },
      userId: 'user-1',
    } as never, res as never);
    expect(sendApiErrorMock).toHaveBeenCalledWith(res, 503, 'DIRECTOR_DEEP_DIVE_DISABLED', 'feature_disabled');
  });

  it('get returns status payload', async () => {
    getStatusMock.mockResolvedValue({
      job_id: 'job-1',
      status: 'running',
      started_at: null,
      completed_at: null,
    });
    const { getDirectorDeepDiveStatusController } = await import('../routes/audits/controllers/get-director-deep-dive-status.controller.js');
    const res = createRes();
    await getDirectorDeepDiveStatusController({
      params: { id: 'audit-1', domain: 'marketing_utp', jobId: 'job-1' },
      userId: 'user-1',
    } as never, res as never);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
