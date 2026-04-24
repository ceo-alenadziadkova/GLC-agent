import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockRetryDomainPhase = vi.fn().mockResolvedValue(undefined);
const mockStartPhase = vi.fn().mockResolvedValue('completed');
const mockRunBlock = vi.fn().mockResolvedValue(undefined);
const mockEnqueue = vi.fn();

vi.mock('../../../pipeline-jobs.js', () => ({
  enqueuePipelineJob: (...args: unknown[]) => mockEnqueue(...args),
}));

vi.mock('../../../pipeline.js', () => ({
  PipelineOrchestrator: vi.fn(function PipelineOrchestratorMock() {
    return {
      retryDomainPhase: mockRetryDomainPhase,
      startPhase: mockStartPhase,
      runBlock: mockRunBlock,
    };
  }),
}));

vi.mock('../../../pipeline-error.js', () => ({
  emitPhaseErrorDurable: vi.fn(),
}));

import { schedulePipelineExecution } from '../schedule-pipeline-execution.js';

describe('schedulePipelineExecution — retry routes to isolated domain path', () => {
  beforeEach(() => {
    mockRetryDomainPhase.mockClear();
    mockStartPhase.mockClear();
    mockRunBlock.mockClear();
    mockEnqueue.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('when queue is unavailable, retry for phase 2 calls retryDomainPhase', async () => {
    mockEnqueue.mockResolvedValue(false);

    await schedulePipelineExecution({
      auditId: 'audit-a',
      action: 'retry',
      phase: 2,
      disableAutoRemediate: false,
    });

    await vi.waitFor(() => {
      expect(mockRetryDomainPhase).toHaveBeenCalledWith(2);
    });
    expect(mockStartPhase).not.toHaveBeenCalled();
  });

  it('when queue is unavailable, retry for phase 0 still uses startPhase', async () => {
    mockEnqueue.mockResolvedValue(false);

    await schedulePipelineExecution({
      auditId: 'audit-a',
      action: 'retry',
      phase: 0,
      disableAutoRemediate: false,
    });

    await vi.waitFor(() => {
      expect(mockStartPhase).toHaveBeenCalledWith(0);
    });
    expect(mockRetryDomainPhase).not.toHaveBeenCalled();
  });

  it('when queue is unavailable, start action still uses startPhase for domain phases', async () => {
    mockEnqueue.mockResolvedValue(false);

    await schedulePipelineExecution({
      auditId: 'audit-a',
      action: 'start',
      phase: 1,
      disableAutoRemediate: false,
    });

    await vi.waitFor(() => {
      expect(mockStartPhase).toHaveBeenCalledWith(1);
    });
    expect(mockRetryDomainPhase).not.toHaveBeenCalled();
  });
});
