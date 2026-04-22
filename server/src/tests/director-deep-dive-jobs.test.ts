import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addMock, upsertMock } = vi.hoisted(() => ({
  addMock: vi.fn(async () => undefined),
  upsertMock: vi.fn(async () => ({ error: null })),
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

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        in: vi.fn(async () => ({ data: [], count: 0 })),
      })),
      upsert: upsertMock,
      update: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
      })),
    })),
  },
}));

describe('director deep-dive queue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
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
});
