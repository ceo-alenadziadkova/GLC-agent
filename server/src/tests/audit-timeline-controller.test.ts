import { beforeEach, describe, expect, it, vi } from 'vitest';

const timelineMocks = vi.hoisted(() => ({
  buildClientTimelineReadModel: vi.fn(),
}));

const sendApiErrorMock = vi.hoisted(() => vi.fn());

vi.mock('../services/orchestration/orchestrator-timeline-read.service.js', () => ({
  buildClientTimelineReadModel: timelineMocks.buildClientTimelineReadModel,
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));

import { getAuditTimelineController } from '../routes/audits/controllers/get-audit-timeline.controller.js';

function createRes() {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  } as unknown as import('express').Response;
}

describe('audit timeline controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns timeline dto on success', async () => {
    timelineMocks.buildClientTimelineReadModel.mockResolvedValue({
      status: 'ok',
      timeline: {
        status: 'ready',
        version: {
          roadmap_version: 2,
          manifest_snapshot_id: null,
          latest_manifest_snapshot_id: null,
          stale_manifest: false,
          manifest_state: 'confirmed',
          season_preset: 'rolling_90d',
        },
        seasons: [],
        lanes: [],
        dependencies: [],
        top_7d: [],
        top_30d: [],
        waiting_list_domains: [],
        data_gaps: null,
      },
    });
    const req = { params: { id: 'audit-1' }, userId: 'user-1', userRole: 'client' } as unknown;
    const res = createRes();
    await getAuditTimelineController(req as never, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        timeline: expect.objectContaining({ status: 'ready' }),
      }),
    );
  });

  it('returns 404 for missing audit', async () => {
    timelineMocks.buildClientTimelineReadModel.mockResolvedValue({ status: 'not_found' });
    const req = { params: { id: 'audit-1' }, userId: 'user-1', userRole: 'client' } as unknown;
    const res = createRes();
    await getAuditTimelineController(req as never, res);
    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 404, expect.any(String), expect.any(String));
  });
});

