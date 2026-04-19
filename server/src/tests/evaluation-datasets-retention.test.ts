import { beforeEach, describe, expect, it, vi } from 'vitest';

const { setDeletedRows, getDeletedRows, setDeleteError, getDeleteError } = vi.hoisted(() => {
  let deletedRows: Array<{ id: string }> = [];
  let deleteError: { message: string } | null = null;
  return {
    setDeletedRows(next: Array<{ id: string }>) {
      deletedRows = next;
    },
    getDeletedRows() {
      return deletedRows;
    },
    setDeleteError(next: { message: string } | null) {
      deleteError = next;
    },
    getDeleteError() {
      return deleteError;
    },
  };
});

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: () => ({
      delete: () => ({
        lt: () => ({
          select: async () => ({ data: getDeletedRows(), error: getDeleteError() }),
        }),
      }),
    }),
  },
}));

import { cleanupExpiredEvaluationDatasets } from '../lib/evaluation-datasets-retention.js';

describe('evaluation datasets retention', () => {
  beforeEach(() => {
    setDeletedRows([]);
    setDeleteError(null);
  });

  it('returns deleted rows count for expired evaluation datasets cleanup', async () => {
    setDeletedRows([{ id: 'a' }, { id: 'b' }]);
    const count = await cleanupExpiredEvaluationDatasets();
    expect(count).toBe(2);
  });

  it('returns 0 when cleanup query fails', async () => {
    setDeleteError({ message: 'db unavailable' });
    const count = await cleanupExpiredEvaluationDatasets();
    expect(count).toBe(0);
  });
});
