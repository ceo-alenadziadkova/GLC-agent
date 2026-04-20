import { beforeEach, describe, expect, it, vi } from 'vitest';

const flagMocks = vi.hoisted(() => ({
  enabled: true,
}));

const readMocks = vi.hoisted(() => ({
  fetch: vi.fn(),
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
  fetchPersistedGlcOrchestrationPackForUser: readMocks.fetch,
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

import { getOrchestrationPackController } from '../routes/audits/controllers/get-orchestration-pack.controller.js';

function createRes() {
  return {
    json: vi.fn(),
  } as unknown as import('express').Response;
}

describe('getOrchestrationPackController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flagMocks.enabled = true;
    readMocks.fetch.mockResolvedValue({
      status: 'ok',
      pack: null,
      orchestration_pack_version: 0,
      last_revision_diff: null,
    });
  });

  it('returns 403 when feature flag is disabled', async () => {
    flagMocks.enabled = false;
    const req = { params: { id: 'audit-1' }, userId: 'user-1' } as unknown;
    const res = createRes();

    await getOrchestrationPackController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 403, expect.any(String), expect.any(String));
  });

  it('returns 404 when audit is missing', async () => {
    readMocks.fetch.mockResolvedValue({ status: 'not_found' });
    const req = { params: { id: 'audit-1' }, userId: 'user-1' } as unknown;
    const res = createRes();

    await getOrchestrationPackController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 404, expect.any(String), expect.any(String));
  });

  it('returns 500 when read service fails', async () => {
    readMocks.fetch.mockResolvedValue({ status: 'error', error: new Error('boom') });
    const req = { params: { id: 'audit-1' }, userId: 'user-1' } as unknown;
    const res = createRes();

    await getOrchestrationPackController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 500, expect.any(String), expect.any(String));
  });

  it('returns persisted pack response on success', async () => {
    const pack = { graph: { nodes: [], edges: [] }, conflicts_resolved: [] };
    const diff = { from_version: 1, to_version: 2 };
    readMocks.fetch.mockResolvedValue({
      status: 'ok',
      pack,
      orchestration_pack_version: 2,
      last_revision_diff: diff,
    });
    const req = { params: { id: 'audit-1' }, userId: 'user-1' } as unknown;
    const res = createRes();

    await getOrchestrationPackController(req as never, res);

    expect(res.json).toHaveBeenCalledWith({
      pack,
      orchestration_pack_version: 2,
      roadmap_version: 2,
      last_revision_diff: diff,
    });
  });
});
