import { beforeEach, describe, expect, it, vi } from 'vitest';

const { repoMocks, loggerWarnMock } = vi.hoisted(() => ({
  repoMocks: {
    applyWordingActionBatchUpdates: vi.fn(),
    applyWordingActionRpcBatch: vi.fn(),
    deleteWordingDraftsByQuestionIds: vi.fn(),
    insertWordingPublicationLog: vi.fn(),
    listWordingActionSourceRows: vi.fn(),
    listWordingDraftRows: vi.fn(),
    listWordingQuestionIds: vi.fn(),
    upsertWordingDrafts: vi.fn(),
  },
  loggerWarnMock: vi.fn(),
}));

vi.mock('../routes/intake-trace-tool/repositories/intake-trace-wording.repository.js', () => repoMocks);
vi.mock('../services/logger.js', () => ({
  logger: {
    warn: loggerWarnMock,
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { applyWordingAction } from '../routes/intake-trace-tool/services/intake-trace-wording.service.js';

describe('intake trace wording service rpc strategy', () => {
  beforeEach(() => {
    Object.values(repoMocks).forEach(mockFn => mockFn.mockReset());
    loggerWarnMock.mockReset();
    repoMocks.listWordingDraftRows.mockResolvedValue([
      { question_id: 'q1', draft_text: 'draft1', published_text: 'pub1' },
    ]);
  });

  it('uses rpc result and does not write duplicate publication log on rpc success', async () => {
    repoMocks.listWordingActionSourceRows.mockResolvedValue([
      { question_id: 'q1', source_text: 'draft1' },
    ]);
    repoMocks.applyWordingActionRpcBatch.mockResolvedValue({
      status: 'ok',
      appliedIds: ['q1'],
    });

    const result = await applyWordingAction({
      userId: 'u1',
      action: 'publish',
      questionIds: ['q1'],
    });

    expect(repoMocks.applyWordingActionBatchUpdates).not.toHaveBeenCalled();
    expect(repoMocks.insertWordingPublicationLog).not.toHaveBeenCalled();
    expect(result.applied_to).toEqual(['q1']);
  });

  it('falls back to batch and writes publication log when rpc unavailable', async () => {
    repoMocks.listWordingActionSourceRows.mockResolvedValue([
      { question_id: 'q1', source_text: 'pub1' },
    ]);
    repoMocks.applyWordingActionRpcBatch.mockResolvedValue({
      status: 'fallback',
      reason: 'function not found',
    });

    const result = await applyWordingAction({
      userId: 'u1',
      action: 'rollback',
      questionIds: ['q1'],
    });

    expect(repoMocks.applyWordingActionBatchUpdates).toHaveBeenCalledTimes(1);
    expect(repoMocks.insertWordingPublicationLog).toHaveBeenCalledWith('u1', 'rollback', ['q1']);
    expect(loggerWarnMock).toHaveBeenCalledTimes(1);
    expect(result.applied_to).toEqual(['q1']);
  });
});
