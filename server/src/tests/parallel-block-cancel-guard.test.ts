import { describe, expect, it, vi } from 'vitest';
import { PIPELINE_EVENT_TYPES } from '../config/pipeline-event-types.js';
import { logger } from '../services/logger.js';
import { runParallelBlockForAudit } from '../services/pipeline/orchestrator/parallel-block.js';
import { PipelineCancelledError } from '../services/pipeline/orchestrator/pipeline-cancelled.error.js';

describe('runParallelBlockForAudit', () => {
  it('logs when multiple isolated phases reject with PipelineCancelledError', async () => {
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const first = new PipelineCancelledError();
    const second = new PipelineCancelledError();
    await expect(
      runParallelBlockForAudit({
        phases: [3, 4],
        parallelFailureThreshold: 2,
        emitEvent: vi.fn().mockResolvedValue(undefined),
        updateAuditIfNotCancelled: vi.fn(),
        assertNotCancelled: vi.fn().mockResolvedValue(undefined),
        runIsolatedPhase: vi
          .fn()
          .mockRejectedValueOnce(first)
          .mockRejectedValueOnce(second),
      }),
    ).rejects.toBe(first);

    expect(warnSpy).toHaveBeenCalledWith(
      'pipeline.parallel_block_multiple_parallel_cancels',
      expect.objectContaining({
        parallel_cancel_error_count: 2,
      }),
    );
    warnSpy.mockRestore();
  });

  it('re-checks cancellation after allSettled before audit updates or completion events', async () => {
    const emitEvent = vi.fn().mockResolvedValue(undefined);
    const updateAuditIfNotCancelled = vi.fn().mockResolvedValue(true);
    const assertNotCancelled = vi.fn().mockRejectedValue(new PipelineCancelledError());
    await expect(
      runParallelBlockForAudit({
        phases: [3, 4],
        parallelFailureThreshold: 2,
        emitEvent,
        updateAuditIfNotCancelled,
        assertNotCancelled,
        runIsolatedPhase: vi.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toBeInstanceOf(PipelineCancelledError);
    expect(updateAuditIfNotCancelled).not.toHaveBeenCalled();
    expect(emitEvent.mock.calls.some((c) => c[1] === PIPELINE_EVENT_TYPES.parallelCompleted)).toBe(false);
    expect(
      emitEvent.mock.calls.some(
        (c) => c[1] === PIPELINE_EVENT_TYPES.error || c[1] === PIPELINE_EVENT_TYPES.partialFailure,
      ),
    ).toBe(false);
  });

  it('still emits parallel lifecycle when phases succeed', async () => {
    const emitEvent = vi.fn().mockResolvedValue(undefined);
    await runParallelBlockForAudit({
      phases: [5],
      parallelFailureThreshold: 2,
      emitEvent,
      updateAuditIfNotCancelled: vi.fn(),
      assertNotCancelled: vi.fn().mockResolvedValue(undefined),
      runIsolatedPhase: vi.fn().mockResolvedValue(undefined),
    });
    expect(emitEvent).toHaveBeenCalled();
    expect(emitEvent.mock.calls.some((c) => c[1] === PIPELINE_EVENT_TYPES.parallelStarted)).toBe(true);
    expect(emitEvent.mock.calls.some((c) => c[1] === PIPELINE_EVENT_TYPES.parallelCompleted)).toBe(true);
  });
});
