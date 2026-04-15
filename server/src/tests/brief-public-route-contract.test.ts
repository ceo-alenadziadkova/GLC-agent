import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const { setSessionRow } = vi.hoisted(() => {
  let sessionRow: Record<string, unknown> = {
    responses: { a12: 'ACME', a11: 'https://acme.test' },
    submitted_at: null,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    status: 'draft',
  };

  const setSessionRow = (next: Record<string, unknown>) => {
    sessionRow = next;
  };

  const mockFrom = vi.fn((table: string) => {
    if (table !== 'public_brief_sessions') {
      return {
        insert: vi.fn(async () => ({ error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
            single: vi.fn(async () => ({ data: null, error: null })),
          })),
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          single: vi.fn(async () => ({ data: null, error: null })),
        })),
      };
    }
    return {
      insert: vi.fn(async () => ({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: sessionRow, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(async () => ({ error: null })),
      })),
    };
  });

  (globalThis as Record<string, unknown>).__briefPublicMockFrom = mockFrom;
  return { setSessionRow };
});

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: (globalThis as Record<string, unknown>).__briefPublicMockFrom,
  },
}));

vi.mock('../middleware/rate-limit.js', () => ({
  briefPublicCreateLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  briefPublicReadLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  briefPublicWriteLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  attachProfile: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { briefPublicRouter } from '../routes/brief-public.js';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/brief-public', briefPublicRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  vi.clearAllMocks();
  setSessionRow({
    responses: { a12: 'ACME', a11: 'https://acme.test' },
    submitted_at: null,
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    status: 'draft',
  });
});

describe('public brief session contract', () => {
  it('creates a session with token and questions', async () => {
    const res = await fetch(`${baseUrl}/api/brief-public/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_name: 'Alice',
        company_name: 'ACME',
        has_website: true,
        website_url: 'https://acme.test',
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(typeof body.session_token).toBe('string');
    expect(Array.isArray(body.questions)).toBe(true);
  });

  it('rejects invalid token on load', async () => {
    const res = await fetch(`${baseUrl}/api/brief-public/session/not-a-token`);
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('INTAKE_INVALID_TOKEN');
  });
});
