import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addMock, upsertMock } = vi.hoisted(() => ({
  addMock: vi.fn(async () => undefined),
  upsertMock: vi.fn(async () => ({ error: null })),
}));

type DeepDiveJobRunRow = {
  queue_job_id: string;
  status: string;
  metadata: { idempotency_key?: string; idempotency_signature?: string };
};

const { selectQueueRowsMock, selectMetadataMock, updateMock } = vi.hoisted(() => ({
  selectQueueRowsMock: vi.fn(async (): Promise<{ data: DeepDiveJobRunRow[]; count: number }> => ({
    data: [],
    count: 0,
  })),
  selectMetadataMock: vi.fn(async () => ({ data: { metadata: {} } })),
  updateMock: vi.fn(() => ({ eq: vi.fn(async () => ({ error: null })) })),
}));

vi.mock('bullmq', () => ({
  Queue: class {
    add = addMock;
  },
  Worker: class {
    on() {
      return this;
    }
  },
}));

vi.mock('../services/redis.js', () => ({
  getRedisUrl: vi.fn(() => 'redis://localhost:6379'),
}));

vi.mock('../services/orchestration/orchestration-read.service.js', () => ({
  loadAuditExecutionPlanRow: vi.fn(async () => ({ plan: { coverage_package: 'pro' } })),
}));

vi.mock('../services/orchestration/director-cmo-orchestrator.service.js', () => ({
  runCmoSubAgentOrchestrator: vi.fn(async () => ({
    mode: 'growth',
    selected_sub_agents: [],
    run_order: [],
    agent_outputs: {},
    director_bundle: { actions: [] },
    qa_block: {
      coherence: '',
      feasibility: '',
      top_3_actions: [],
      risks: [],
      measurement: [],
    },
  })),
}));

vi.mock('../services/orchestration/roadmap-manifest.service.js', () => ({
  fetchLatestRoadmapManifestSnapshotIdForAudit: vi.fn(async () => null),
}));

vi.mock('../services/orchestration/orchestration-pack-persist-run.service.js', () => ({
  runOrchestrationPackPersistFlowFromManifest: vi.fn(async () => ({ ok: false, kind: 'not_ready' })),
}));

vi.mock('../services/orchestration/director-orchestration-persistence.service.js', () => ({
  persistGlcDirectorOrchestrationSliceForAuditOwner: vi.fn(async () => ({ error: null })),
}));

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn((columns: string) => {
        if (columns.includes('metadata') && !columns.includes('queue_job_id')) {
          return {
            eq: vi.fn(() => ({
              maybeSingle: selectMetadataMock,
            })),
          };
        }
        return {
          eq: vi.fn().mockReturnThis(),
          in: selectQueueRowsMock,
          maybeSingle: selectMetadataMock,
        };
      }),
      upsert: upsertMock,
      update: updateMock,
    })),
  },
}));

describe('director deep-dive queue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    selectQueueRowsMock.mockResolvedValue({ data: [], count: 0 });
    selectMetadataMock.mockResolvedValue({ data: { metadata: {} } });
  });

  it('enqueues BullMQ job and persists queued status', async () => {
    const { enqueueDirectorDeepDive } = await import('../services/orchestration/run-director-deep-dive.service.js');
    const result = await enqueueDirectorDeepDive({
      auditId: 'audit-1',
      userId: 'user-1',
      domainKey: 'marketing_utp',
      idempotencyKey: 'idem-1',
      goals: ['Grow leads'],
      constraints: ['Budget cap'],
    });
    expect(result.status).toBe('queued');
    expect(addMock).toHaveBeenCalledOnce();
    expect(upsertMock).toHaveBeenCalled();
  });

  it('returns existing job id for repeated idempotency key', async () => {
    selectQueueRowsMock.mockResolvedValue({
      data: [{ queue_job_id: 'job-existing', status: 'queued', metadata: { idempotency_key: 'idem-1' } }],
      count: 1,
    });
    const { enqueueDirectorDeepDive } = await import('../services/orchestration/run-director-deep-dive.service.js');
    const result = await enqueueDirectorDeepDive({
      auditId: 'audit-1',
      userId: 'user-1',
      domainKey: 'marketing_utp',
      idempotencyKey: 'idem-1',
      goals: ['Grow leads'],
      constraints: [],
    });
    expect(result).toEqual({ status: 'queued', job_id: 'job-existing' });
    expect(addMock).not.toHaveBeenCalled();
  });

  it('returns idempotency_mismatch when payload differs for existing idempotency key', async () => {
    selectQueueRowsMock.mockResolvedValue({
      data: [
        {
          queue_job_id: 'job-existing',
          status: 'queued',
          metadata: {
            idempotency_key: 'idem-1',
            idempotency_signature: JSON.stringify({
              domainKey: 'marketing_utp',
              goals: ['Old goal'],
              constraints: [],
              requestedMode: null,
              requestedSubAgentIds: null,
            }),
          },
        },
      ],
      count: 1,
    });
    const { enqueueDirectorDeepDive } = await import('../services/orchestration/run-director-deep-dive.service.js');
    const result = await enqueueDirectorDeepDive({
      auditId: 'audit-1',
      userId: 'user-1',
      domainKey: 'marketing_utp',
      idempotencyKey: 'idem-1',
      goals: ['Grow leads'],
      constraints: [],
    });
    expect(result).toEqual({ status: 'idempotency_mismatch' });
    expect(addMock).not.toHaveBeenCalled();
  });

  it('returns quota_exceeded when package quota reached', async () => {
    selectQueueRowsMock.mockResolvedValue({
      data: [
        { queue_job_id: 'job-1', status: 'completed', metadata: { idempotency_key: 'k1' } },
        { queue_job_id: 'job-2', status: 'completed', metadata: { idempotency_key: 'k2' } },
      ],
      count: 2,
    });
    const { enqueueDirectorDeepDive } = await import('../services/orchestration/run-director-deep-dive.service.js');
    const result = await enqueueDirectorDeepDive({
      auditId: 'audit-1',
      userId: 'user-1',
      domainKey: 'marketing_utp',
      idempotencyKey: 'idem-3',
      goals: ['Grow leads'],
      constraints: [],
    });
    expect(result).toEqual({ status: 'quota_exceeded' });
    expect(addMock).not.toHaveBeenCalled();
  });

  it('returns token_budget_exceeded when requested sub-agents exceed package budget', async () => {
    const { loadAuditExecutionPlanRow } = await import('../services/orchestration/orchestration-read.service.js');
    vi.mocked(loadAuditExecutionPlanRow).mockResolvedValueOnce({ plan: { coverage_package: 'starter' } } as never);
    const { enqueueDirectorDeepDive } = await import('../services/orchestration/run-director-deep-dive.service.js');
    const result = await enqueueDirectorDeepDive({
      auditId: 'audit-1',
      userId: 'user-1',
      domainKey: 'marketing_utp',
      idempotencyKey: 'idem-token-cap',
      goals: ['Grow leads'],
      constraints: [],
      requestedMode: 'launch',
      requestedSubAgentIds: ['cmo.agent_3_positioning', 'cmo.agent_5_content_strategy'],
    });
    expect(result).toEqual({ status: 'token_budget_exceeded' });
    expect(addMock).not.toHaveBeenCalled();
  });
});
