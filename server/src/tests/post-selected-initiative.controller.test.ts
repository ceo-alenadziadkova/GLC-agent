import { beforeEach, describe, expect, it, vi } from 'vitest';

const executeMock = vi.hoisted(() => vi.fn());
const latestSnapshotMock = vi.hoisted(() => vi.fn());
const sendApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock('../services/orchestration/roadmap-manifest.service.js', () => ({
  fetchLatestRoadmapManifestSnapshotIdForAudit: latestSnapshotMock,
}));

vi.mock('../routes/audits/controllers/post-orchestration-pack.controller.js', () => ({
  executePostOrchestrationPack: executeMock,
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

import { postSelectedInitiativeController } from '../routes/audits/controllers/post-selected-initiative.controller.js';

function createRes() {
  return {
    json: vi.fn(),
  } as unknown as import('express').Response;
}

describe('postSelectedInitiativeController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    latestSnapshotMock.mockResolvedValue({ id: '00000000-0000-4000-8000-000000000001' });
    executeMock.mockResolvedValue(undefined);
  });

  it('returns 400 on invalid payload', async () => {
    const req = { params: { id: 'audit-1' }, body: {} } as unknown;
    const res = createRes();

    await postSelectedInitiativeController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      400,
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('returns 409 when latest snapshot is missing', async () => {
    latestSnapshotMock.mockResolvedValue(null);
    const req = { params: { id: 'audit-1' }, body: { action_id: 'n1' } } as unknown;
    const res = createRes();

    await postSelectedInitiativeController(req as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(
      expect.anything(),
      409,
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ not_ready_reason_code: 'manifest_snapshot_missing' }),
    );
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('forwards to orchestration pack flow with selected_action_ids', async () => {
    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: { action_id: 'node-42' },
    } as unknown;
    const res = createRes();

    await postSelectedInitiativeController(req as never, res);

    expect(executeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { id: 'audit-1' },
        body: {
          manifest_snapshot_id: '00000000-0000-4000-8000-000000000001',
          selected_action_ids: ['node-42'],
        },
      }),
      res,
      expect.stringContaining('/api/audits/audit-1/orchestration/selected-initiative'),
    );
  });
});
