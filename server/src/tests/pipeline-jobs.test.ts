import { beforeEach, describe, expect, it, vi } from 'vitest';

const { addMock } = vi.hoisted(() => ({
  addMock: vi.fn(async () => undefined),
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

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../services/pipeline.js', () => ({
  PipelineOrchestrator: class {},
}));

vi.mock('../services/pipeline-error.js', () => ({
  emitPhaseErrorDurable: vi.fn(async () => undefined),
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(async () => ({ error: null })),
      update: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
      })),
    })),
  },
}));

describe('pipeline jobs queue', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.PIPELINE_QUEUE_REDIS_URL = '';
    process.env.RATE_LIMIT_REDIS_URL = '';
  });

  it('returns false when no Redis URL configured', async () => {
    const { enqueuePipelineJob } = await import('../services/pipeline-jobs.js');
    const ok = await enqueuePipelineJob({ auditId: 'a1', action: 'start', phase: 0 });
    expect(ok).toBe(false);
    expect(addMock).not.toHaveBeenCalled();
  }, 15000);

  it('enqueues job when Redis URL is configured', async () => {
    process.env.PIPELINE_QUEUE_REDIS_URL = 'redis://localhost:6379';
    const { enqueuePipelineJob } = await import('../services/pipeline-jobs.js');
    const ok = await enqueuePipelineJob({ auditId: 'a1', action: 'next', phase: 1 });
    expect(ok).toBe(true);
    expect(addMock).toHaveBeenCalledOnce();
    expect(addMock).toHaveBeenCalledWith(
      'next:a1:1',
      { auditId: 'a1', action: 'next', phase: 1 },
      expect.objectContaining({ jobId: 'next:a1:1' }),
    );
  }, 15000);
});

