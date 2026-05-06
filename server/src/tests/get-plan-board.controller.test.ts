import { beforeEach, describe, expect, it, vi } from 'vitest';

const ffMocks = vi.hoisted(() => ({ orchPackEnabled: true }));
const accessMocks = vi.hoisted(() => ({ resolve: vi.fn() }));
const readMocks = vi.hoisted(() => ({ fetch: vi.fn() }));
const listMocks = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationPackApiEnabled: () => ffMocks.orchPackEnabled,
  };
});

vi.mock('../services/plan-board/plan-board-access.js', () => ({
  resolveAuditPlanBoardAccess: accessMocks.resolve,
}));

vi.mock('../services/orchestration/orchestration-read.service.js', () => ({
  fetchPersistedGlcOrchestrationPackForUser: readMocks.fetch,
}));

vi.mock('../services/plan-board/plan-board-cards.service.js', () => ({
  listPlanBoardCardsForAudit: listMocks.list,
}));

vi.mock('../services/plan-board/plan-board-column-policy.service.js', async importOriginal => {
  const actual =
    await importOriginal<typeof import('../services/plan-board/plan-board-column-policy.service.js')>();
  return {
    ...actual,
    resolvePlanBoardPolicyForAuditId: vi.fn().mockResolvedValue(null),
  };
});

const sendApiErrorMock = vi.hoisted(() => vi.fn());
const parityMocks = vi.hoisted(() => ({
  build: vi.fn().mockResolvedValue({
    season_preset: null,
    top_7d: [] as string[],
    top_30d: [] as string[],
    top_priorities: [] as Array<{ bucket: '7d' | '30d'; action_id: string; reason_code: string }>,
    milestones: [] as Array<{ id: string; label: string; target_window_days: number; unlocks: string[] }>,
  }),
}));
vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: sendApiErrorMock,
}));
vi.mock('../services/orchestration/orchestrator-timeline-read.service.js', () => ({
  buildPlanBoardTimelineParity: parityMocks.build,
}));

import { getPlanBoardController } from '../routes/audits/controllers/get-plan-board.controller.js';

function createRes(): import('express').Response {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn(),
  } as unknown as import('express').Response;
}

describe('getPlanBoardController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ffMocks.orchPackEnabled = true;
    accessMocks.resolve.mockResolvedValue({ ok: true, kind: 'consultant_owner' });
    readMocks.fetch.mockResolvedValue({
      status: 'ok',
      pack: null,
      orchestration_pack_version: 0,
    });
    listMocks.list.mockResolvedValue({ cards: [], error: null });
  });

  it('returns 403 when orchestration pack API is disabled', async () => {
    ffMocks.orchPackEnabled = false;
    const res = createRes();

    await getPlanBoardController(
      { params: { id: 'a1' }, userId: 'u1' } as never,
      res,
    );

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 403, expect.any(String), expect.any(String));
  });

  it('returns 404 when audit is not readable for caller', async () => {
    accessMocks.resolve.mockResolvedValue({ ok: false, reason: 'not_found' });
    const res = createRes();

    await getPlanBoardController({ params: { id: 'a1' }, userId: 'u1' } as never, res);

    expect(sendApiErrorMock).toHaveBeenCalledWith(expect.anything(), 404, expect.any(String), expect.any(String));
  });

  it('returns no_pack issues without cards when pack is absent', async () => {
    const res = createRes();

    await getPlanBoardController({ params: { id: 'a1' }, userId: 'u1' } as never, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pack_version_used: 0,
        cards: [],
        issues: [{ code: 'no_pack' }],
        columns: expect.arrayContaining([expect.objectContaining({ id: 'backlog' })]),
      }),
    );
  });

  it('clients receive filtered subset (mocked downstream filter)', async () => {
    accessMocks.resolve.mockResolvedValue({ ok: true, kind: 'client' });
    readMocks.fetch.mockResolvedValue({
      status: 'ok',
      pack: {
        graph: {
          nodes: [{ id: 'n1', title: 'Alpha', lane: 'lane_a' }],
          edges: [],
        },
      },
      orchestration_pack_version: 7,
    });
    listMocks.list.mockResolvedValue({
      cards: [
        {
          id: 'card-1',
          source: 'pack',
          canonical_node_key: 'ck1',
          pack_graph_node_id: 'n1',
          manual_title: null,
          delivery_area: 'board',
          column_id: 'next_up',
          position: 0,
          pinned: false,
          last_applied_pack_version: 7,
          orphaned_reason: null,
          pack_lane_snapshot: 'lane_a',
        },
        {
          id: 'card-2',
          source: 'manual',
          canonical_node_key: null,
          pack_graph_node_id: null,
          manual_title: 'Hidden',
          delivery_area: 'backlog',
          column_id: 'backlog',
          position: 0,
          pinned: false,
          last_applied_pack_version: null,
          orphaned_reason: null,
          pack_lane_snapshot: null,
        },
      ],
      error: null,
    });
    const res = createRes();

    await getPlanBoardController({ params: { id: 'a1' }, userId: 'u-client' } as never, res);

    expect(res.json).toHaveBeenCalled();
    const body = vi.mocked(res.json).mock.calls[0]?.[0] as { cards: Array<{ id: string }>; issues?: unknown };
    expect(body.cards.every((r) => r.id === 'card-1')).toBe(true);
  });

  it('includes governance_blocked issues when pack is degraded', async () => {
    readMocks.fetch.mockResolvedValue({
      status: 'ok',
      pack: {
        graph: {
          nodes: [{ id: 'n1', title: 'Alpha', lane: 'lane_a' }],
          edges: [],
        },
        input_quality: { degraded: true },
      },
      orchestration_pack_version: 8,
    });
    listMocks.list.mockResolvedValue({
      cards: [
        {
          id: 'c1',
          source: 'pack',
          canonical_node_key: 'k',
          pack_graph_node_id: 'n1',
          manual_title: null,
          delivery_area: 'board',
          column_id: 'next_up',
          position: 0,
          pinned: false,
          last_applied_pack_version: 8,
          orphaned_reason: null,
          pack_lane_snapshot: 'lane_a',
        },
      ],
      error: null,
    });
    const res = createRes();

    await getPlanBoardController({ params: { id: 'a1' }, userId: 'u1' } as never, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pack_version_used: 8,
        issues: [{ code: 'governance_blocked' }],
        columns: expect.any(Array),
        cards: expect.arrayContaining([expect.objectContaining({ id: 'c1', title: 'Alpha' })]),
        timeline_parity: expect.objectContaining({
          top_7d: [],
          top_30d: [],
          top_priorities: [],
        }),
      }),
    );
  });
});
