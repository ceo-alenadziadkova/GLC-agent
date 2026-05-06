import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../data/api-error';
import { planBoardQueryKeys } from '../../data/api/plan-board-queries';
import { invalidatePlanBoardQueriesAfterConflict } from '../plan-board-query-invalidation';
import { glcKeys } from '../glc-keys';

describe('invalidatePlanBoardQueriesAfterConflict', () => {
  it('invalidates plan-board and pack queries on 409 ApiError', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    const qc = { invalidateQueries };
    await invalidatePlanBoardQueriesAfterConflict(qc, 'audit-a', new ApiError('Conflict', 409, 'X'));
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: planBoardQueryKeys.audit('audit-a') });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: glcKeys.orchestrationPack.detail('audit-a') });
  });

  it('no-ops for non-409 errors', async () => {
    const invalidateQueries = vi.fn();
    await invalidatePlanBoardQueriesAfterConflict({ invalidateQueries }, 'audit-a', new Error('nope'));
    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
