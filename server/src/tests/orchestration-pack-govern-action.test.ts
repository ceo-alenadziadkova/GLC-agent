import { describe, expect, it, vi, beforeEach } from 'vitest';

import { API_ERROR_CODES } from '../config/api-error-codes.js';

const runGovernancePackActionMock = vi.hoisted(() => vi.fn());
const fetchPersistedMock = vi.hoisted(() => vi.fn());

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isOrchestrationPackApiEnabled: () => true,
    isConsultantGovernanceCtasEnabled: () => true,
  };
});

vi.mock('../services/orchestration/orchestration-governance-ack.service.js', () => ({
  runGovernancePackAction: runGovernancePackActionMock,
}));

vi.mock('../services/orchestration/orchestration-read.service.js', () => ({
  fetchPersistedGlcOrchestrationPackForUser: fetchPersistedMock,
}));

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../routes/audits/mappers/audits-http.mapper.js', () => ({
  sendApiError: vi.fn(),
}));

vi.mock('../lib/idempotency.js', () => ({
  getStoredIdempotentResponse: vi.fn().mockResolvedValue({ key: null, hash: undefined, replay: undefined }),
  storeIdempotentResponse: vi.fn().mockResolvedValue(undefined),
  isIdempotencyPayloadConflictError: () => false,
}));

import { sendApiError } from '../routes/audits/mappers/audits-http.mapper.js';
import { postOrchestrationPackController } from '../routes/audits/controllers/post-orchestration-pack.controller.js';

function createRes() {
  return {
    json: vi.fn(),
  } as unknown as import('express').Response;
}

describe('postOrchestrationPackController governance CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchPersistedMock.mockResolvedValue({
      status: 'ok',
      pack: { version: 2, graph: { nodes: [], edges: [] } },
    });
  });

  it('returns 409 when runGovernancePackAction reports stale pack version', async () => {
    runGovernancePackActionMock.mockResolvedValue({ ok: false, kind: 'stale' });
    const res = createRes();
    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: {
        govern_action: 'accept_plan',
        expected_orchestration_pack_version: 3,
      },
    } as unknown;

    await postOrchestrationPackController(req as never, res);

    expect(sendApiError).toHaveBeenCalledWith(
      expect.anything(),
      409,
      API_ERROR_CODES.AUDITS_ORCHESTRATION_PACK_STALE_VERSION,
      expect.any(String),
      expect.objectContaining({
        current_orchestration_pack_version: 3,
      }),
    );
  });

  it('returns 200 JSON when accept_plan succeeds', async () => {
    runGovernancePackActionMock.mockResolvedValue({ ok: true, orchestration_pack_version: 4, refine_hint: false });
    const res = createRes();
    const req = {
      params: { id: 'audit-1' },
      userId: 'user-1',
      body: {
        govern_action: 'accept_plan',
        expected_orchestration_pack_version: 4,
      },
    } as unknown;

    await postOrchestrationPackController(req as never, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        orchestration_pack_version: 4,
        govern_action: 'accept_plan',
        refine_hint: false,
      }),
    );
  });
});
