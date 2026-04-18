import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const { setListShouldFail, setFetchShouldThrow } = vi.hoisted(() => {
  let listShouldFail = false;
  let fetchShouldThrow = false;

  const setListShouldFail = (value: boolean) => { listShouldFail = value; };
  const setFetchShouldThrow = (value: boolean) => { fetchShouldThrow = value; };

  const makeAuditsChain = () => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.or = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.range = vi.fn(async () => (
      listShouldFail
        ? { data: null, error: { message: 'list failed' }, count: null }
        : { data: [], error: null, count: 0 }
    ));
    chain.single = vi.fn(async () => {
      if (fetchShouldThrow) throw new Error('audit fetch exploded');
      return {
        data: {
          id: 'audit-001',
          user_id: 'user-001',
          client_id: null,
          product_mode: 'express',
          status: 'created',
          company_url: 'https://example.com',
        },
        error: null,
      };
    });
    return chain;
  };

  const makeChildChain = () => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.order = vi.fn(async () => ({ data: [], error: null }));
    chain.single = vi.fn(async () => ({ data: null, error: null }));
    return chain;
  };

  const mockFrom = vi.fn((table: string) => (
    table === 'audits' ? makeAuditsChain() : makeChildChain()
  ));
  (globalThis as Record<string, unknown>).__auditsListFetchMockFrom = mockFrom;

  return { setListShouldFail, setFetchShouldThrow };
});

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__auditsListFetchMockFrom },
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userId = 'user-001';
    req.userEmail = 'user@example.com';
    req.userRole = 'consultant';
    next();
  },
  attachProfile: (_req: unknown, _res: unknown, next: () => void) => next(),
  rejectGuestFromPortal: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/rate-limit.js', () => ({
  createAuditLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  generalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  pipelineLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { auditsRouter } from '../routes/audits.js';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/audits', auditsRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  vi.clearAllMocks();
  setListShouldFail(false);
  setFetchShouldThrow(false);
});

describe('audits list/fetch route contract errors', () => {
  it('GET /api/audits returns 500 with AUDITS_LIST_FAILED on list query failure', async () => {
    setListShouldFail(true);
    const res = await fetch(`${baseUrl}/api/audits`);
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('AUDITS_LIST_FAILED');
  });

  it('GET /api/audits/:id returns 500 with AUDITS_FETCH_FAILED on unexpected fetch error', async () => {
    setFetchShouldThrow(true);
    const res = await fetch(`${baseUrl}/api/audits/audit-001`);
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('AUDITS_FETCH_FAILED');
  });
});
