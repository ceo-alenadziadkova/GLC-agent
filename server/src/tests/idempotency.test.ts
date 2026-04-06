import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthRequest } from '../middleware/auth.js';

const { setStoredRow, getStoredRow, setDeletedRows, getDeletedRows, setDeleteError, getDeleteError } = vi.hoisted(() => {
  let row: Record<string, unknown> | null = null;
  let deletedRows: Array<{ id: number }> = [];
  let deleteError: { message: string } | null = null;
  return {
    setStoredRow(next: Record<string, unknown> | null) {
      row = next;
    },
    getStoredRow() {
      return row;
    },
    setDeletedRows(next: Array<{ id: number }>) {
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
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({
              single: async () => ({ data: getStoredRow(), error: null }),
            }),
          }),
        }),
      }),
      upsert: async () => ({ error: null }),
      delete: () => ({
        lt: () => ({
          select: async () => ({ data: getDeletedRows(), error: getDeleteError() }),
        }),
      }),
    }),
  },
}));

import { cleanupExpiredIdempotencyKeys, getStoredIdempotentResponse } from '../lib/idempotency.js';

function mockReq(idempotencyKey: string, userId = 'user-1', body: Record<string, unknown> = {}): AuthRequest {
  return {
    userId,
    body,
    header(name: string) {
      if (name.toLowerCase() === 'idempotency-key') return idempotencyKey;
      return undefined;
    },
  } as unknown as AuthRequest;
}

describe('idempotency helper', () => {
  beforeEach(() => {
    setStoredRow(null);
    setDeletedRows([]);
    setDeleteError(null);
  });

  it('returns replay payload when key and payload hash match', async () => {
    setStoredRow({
      request_hash: '{"a":1}',
      response_status: 201,
      response_body: { id: 'audit-1', status: 'created' },
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    const req = mockReq('same-key', 'user-1', { a: 1 });
    const result = await getStoredIdempotentResponse(req, 'POST:/api/audits', { a: 1 });
    expect(result.replay?.statusCode).toBe(201);
    expect(result.replay?.payload.id).toBe('audit-1');
  });

  it('throws conflict when key reused with different payload', async () => {
    setStoredRow({
      request_hash: '{"a":1}',
      response_status: 201,
      response_body: { id: 'audit-1' },
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    });
    const req = mockReq('same-key', 'user-1', { a: 2 });
    await expect(getStoredIdempotentResponse(req, 'POST:/api/audits', { a: 2 })).rejects.toThrow(/different payload/i);
  });

  it('returns deleted rows count for expired keys cleanup', async () => {
    setDeletedRows([{ id: 1 }, { id: 2 }, { id: 3 }]);
    const count = await cleanupExpiredIdempotencyKeys();
    expect(count).toBe(3);
  });

  it('returns 0 when cleanup query fails', async () => {
    setDeleteError({ message: 'db unavailable' });
    const count = await cleanupExpiredIdempotencyKeys();
    expect(count).toBe(0);
  });
});
