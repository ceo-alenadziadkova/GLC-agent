import { beforeEach, describe, expect, it, vi } from 'vitest';

const flagMocks = vi.hoisted(() => ({
  enabled: true,
}));

const readMocks = vi.hoisted(() => ({
  history: vi.fn(),
}));

const sendApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationPackApiEnabled: () => flagMocks.enabled,
  };
});

vi.mock('../services/orchestration/orchestration-read.service.js', () => ({
  fetchOrchestrationPackRevisionHistoryForUser: readMocks.history,
  fetchPersistedGlcOrchestrationPackForUser: vi.fn().mockResolvedValue({ status: 'ok', pack: null }),
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

import { getOrchestrationPackDiffHistoryController } from '../routes/audits/controllers/get-orchestration-pack-diff-history.controller.js';

function createRes() {
  return { json: vi.fn() } as unknown as import('express').Response;
}

describe('getOrchestrationPackDiffHistoryController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flagMocks.enabled = true;
    readMocks.history.mockResolvedValue({ status: 'ok', items: [] });
  });

  it('returns 403 when feature flag is disabled', async () => {
    flagMocks.enabled = false;
    const req = { params: { id: 'audit-1' }, userId: 'user-1', query: {} } as unknown;
    const res = createRes();
    await getOrchestrationPackDiffHistoryController(req as never, res);
    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 403, expect.any(String), expect.any(String));
  });

  it('returns 404 when audit is missing', async () => {
    readMocks.history.mockResolvedValue({ status: 'not_found' });
    const req = { params: { id: 'audit-1' }, userId: 'user-1', query: {} } as unknown;
    const res = createRes();
    await getOrchestrationPackDiffHistoryController(req as never, res);
    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 404, expect.any(String), expect.any(String));
  });

  it('returns history items on success', async () => {
    const items = [{ from_version: 1, to_version: 2, diff: { from_version: 1, to_version: 2 } }];
    readMocks.history.mockResolvedValue({ status: 'ok', items });
    const req = { params: { id: 'audit-1' }, userId: 'user-1', query: { limit: '5' } } as unknown;
    const res = createRes();
    await getOrchestrationPackDiffHistoryController(req as never, res);
    expect(res.json).toHaveBeenCalledWith({ items, latest_plan_governance: null });
  });
});
