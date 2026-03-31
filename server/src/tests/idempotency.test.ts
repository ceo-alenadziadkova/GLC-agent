import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthRequest } from '../middleware/auth.js';

const { setStoredRow, getStoredRow } = vi.hoisted(() => {
  let row: Record<string, unknown> | null = null;
  return {
    setStoredRow(next: Record<string, unknown> | null) {
      row = next;
    },
    getStoredRow() {
      return row;
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
    }),
  },
}));

import { getStoredIdempotentResponse } from '../lib/idempotency.js';

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
  beforeEach(() => setStoredRow(null));

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
});
