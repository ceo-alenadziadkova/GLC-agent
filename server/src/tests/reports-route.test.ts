/**
 * GET /api/audits/:id/report — markdown, JSON, CSV; owner vs client access.
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';
import { reportsRouter } from '../routes/reports.js';

const AUDIT_ID = 'audit-report-001';
const OWNER_ID = 'user-owner';
const CLIENT_ID = 'user-client';

const { setRequestUserId, resetSupabaseMock } = vi.hoisted(() => {
  const domainUx = {
    audit_id: 'audit-report-001',
    domain_key: 'ux_conversion',
    phase_number: 4,
    status: 'completed',
    version: 1,
    score: 3,
    label: 'Moderate',
    summary: 'UX summary',
    quick_wins: [{ title: 'Fix hero CTA', timeframe: '1 week' }],
    recommendations: [],
  };

  const auditBaseLocal = {
    id: 'audit-report-001',
    company_url: 'https://example.com',
    company_name: null,
    created_at: '2025-01-15T10:00:00.000Z',
    product_mode: 'express',
    user_id: 'user-owner',
    client_id: 'user-client',
  };

  let requestUserId = 'user-owner';
  const setRequestUserId = (id: string) => {
    requestUserId = id;
  };

  const makeAuditsChain = () => {
    const chain: Record<string, unknown> = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.or = vi.fn(() => chain);
    chain.single = vi.fn(() => {
      const uid = requestUserId;
      const allowed = auditBaseLocal.user_id === uid || auditBaseLocal.client_id === uid;
      if (!allowed) {
        return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
      }
      return Promise.resolve({ data: { ...auditBaseLocal }, error: null });
    });
    return chain;
  };

  const makeDomainsChain = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn(() => Promise.resolve({ data: [domainUx], error: null })),
  });

  const makeSingleChain = (data: unknown) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error: null })),
  });

  const mockFrom = vi.fn((table: string) => {
    if (table === 'audits') return makeAuditsChain();
    if (table === 'audit_domains') return makeDomainsChain();
    if (table === 'audit_recon') return makeSingleChain({ company_name: 'Example Ltd', industry: 'SaaS' });
    if (table === 'audit_strategy') return makeSingleChain(null);
    if (table === 'notifications') {
      return { insert: vi.fn(() => Promise.resolve({ error: null })) };
    }
    return makeSingleChain(null);
  });

  const resetSupabaseMock = () => {
    mockFrom.mockClear();
  };

  (globalThis as Record<string, unknown>).__reportsGetUserId = () => requestUserId;
  (globalThis as Record<string, unknown>).__reportsMockFrom = mockFrom;

  return { setRequestUserId, resetSupabaseMock };
});

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__reportsMockFrom as () => unknown },
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userId = ((globalThis as Record<string, unknown>).__reportsGetUserId as () => string)();
    next();
  },
}));

vi.mock('../middleware/rate-limit.js', () => ({
  generalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use('/api/audits', reportsRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  setRequestUserId(OWNER_ID);
  resetSupabaseMock();
});

describe('GET /api/audits/:id/report', () => {
  it('returns markdown for owner', async () => {
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=markdown`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/markdown/);
    const text = await res.text();
    expect(text).toContain('Example Ltd');
    expect(text).toContain('UX summary');
  });

  it('returns CSV for client with access', async () => {
    setRequestUserId(CLIENT_ID);
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=csv`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/csv/);
    const text = await res.text();
    expect(text).toContain('Title,Domain,Type');
    expect(text).toContain('Fix hero CTA');
  });

  it('returns 404 for unrelated user', async () => {
    setRequestUserId('user-stranger');
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report`);
    expect(res.status).toBe(404);
  });
});
