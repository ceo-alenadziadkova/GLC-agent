import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const { setInsertShouldFail } = vi.hoisted(() => {
  let insertShouldFail = false;

  const setInsertShouldFail = (value: boolean) => {
    insertShouldFail = value;
  };

  const mockFrom = vi.fn((table: string) => {
    if (table !== 'marketing_brief_submissions') {
      return {
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      };
    }

    return {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => {
            if (insertShouldFail) return { data: null, error: { message: 'insert failed' } };
            return {
              data: {
                id: 'mkt-001',
                created_at: '2026-04-10T10:00:00.000Z',
                recommended_route: '/starter',
              },
              error: null,
            };
          }),
        })),
      })),
    };
  });

  (globalThis as Record<string, unknown>).__marketingBriefMockFrom = mockFrom;

  return { setInsertShouldFail };
});

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: (globalThis as Record<string, unknown>).__marketingBriefMockFrom,
  },
}));

vi.mock('../middleware/rate-limit.js', () => ({
  marketingBriefPublicLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../services/notifications.js', () => ({
  emitStructuredNotification: vi.fn(async () => undefined),
}));

import { marketingRouter } from '../routes/marketing-brief.js';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/marketing', marketingRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  vi.clearAllMocks();
  setInsertShouldFail(false);
});

describe('POST /api/marketing/brief contract', () => {
  it('returns 400 with name-required code when name is missing', async () => {
    const res = await fetch(`${baseUrl}/api/marketing/brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ no_website: true, unsure_choice: true }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('MARKETING_NAME_REQUIRED');
  });

  it('returns 400 with website-required code when website is absent and no_website is false', async () => {
    const res = await fetch(`${baseUrl}/api/marketing/brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice', no_website: false, unsure_choice: false }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('MARKETING_WEBSITE_OR_FLAG_REQUIRED');
  });

  it('returns 400 with depth-required code when depth is required but missing', async () => {
    const res = await fetch(`${baseUrl}/api/marketing/brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        website: 'https://example.com',
        no_website: false,
        unsure_choice: false,
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('MARKETING_DEPTH_REQUIRED');
  });

  it('returns 500 with save-failed code when persistence fails', async () => {
    setInsertShouldFail(true);
    const res = await fetch(`${baseUrl}/api/marketing/brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice',
        website: 'https://example.com',
        no_website: false,
        unsure_choice: false,
        preferred_audit_depth: 'express',
      }),
    });
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('MARKETING_SAVE_FAILED');
  });
});
