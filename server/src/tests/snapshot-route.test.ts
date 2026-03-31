/**
 * Integration tests: POST /api/snapshot + GET /api/snapshot/:token
 *
 * Tests the public snapshot HTTP endpoints:
 *  - POST creates an audit record + starts the pipeline async
 *  - GET polls by snapshot_token → returns status or full preview
 *
 * Uses a real Express app started on a random port.
 * Supabase and PipelineOrchestrator are mocked — no real DB or LLM calls.
 *
 * Note: uses node native fetch (Node 18+).
 */
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, type Mock } from 'vitest';
import type { Server } from 'node:http';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockInsert,
  mockSnapshotSelect,
  mockReconSelect,
  mockUxSelect,
  mockRunFreeSnapshot,
  setInsertResult,
  setSnapshotQueryResult,
  setReconQueryResult,
  setUxQueryResult,
} = vi.hoisted(() => {
  // Insert chain for audit creation
  let insertResult: { id: string } | null = { id: 'new-audit-id-001' };
  const setInsertResult = (v: { id: string } | null) => { insertResult = v; };

  const mockInsertSingle = vi.fn(() =>
    Promise.resolve({ data: insertResult, error: insertResult ? null : new Error('insert failed') })
  );
  const mockInsert = vi.fn(() => ({
    select: vi.fn(() => ({ single: mockInsertSingle })),
  }));

  // Various SELECT return values
  let snapshotQueryResult: Record<string, unknown> | null = null;
  let reconQueryResult: Record<string, unknown> | null = null;
  let uxQueryResult: Record<string, unknown> | null = null;

  const setSnapshotQueryResult = (v: Record<string, unknown> | null) => {
    snapshotQueryResult = v
      ? { created_at: new Date().toISOString(), ...v }
      : null;
  };
  const setReconQueryResult = (v: Record<string, unknown> | null) => { reconQueryResult = v; };
  const setUxQueryResult = (v: Record<string, unknown> | null) => { uxQueryResult = v; };

  const mockSnapshotSelect = vi.fn(() => ({
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() =>
      Promise.resolve({
        data: snapshotQueryResult,
        error: snapshotQueryResult ? null : { code: 'PGRST116' },
      })
    ),
  }));

  const mockReconSelect = vi.fn(() => ({
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() =>
      Promise.resolve({ data: reconQueryResult, error: null })
    ),
  }));

  const mockUxSelect = vi.fn(() => ({
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(() =>
      Promise.resolve({ data: uxQueryResult, error: null })
    ),
  }));

  // Insert for child records (audit_recon, audit_domains) — always succeeds
  const mockChildInsert = vi.fn().mockResolvedValue({ error: null });

  // PipelineOrchestrator.runFreeSnapshot — async, does not block the route
  const mockRunFreeSnapshot = vi.fn().mockResolvedValue(undefined);

  (globalThis as Record<string, unknown>).__mockInsert = mockInsert;
  (globalThis as Record<string, unknown>).__mockChildInsert = mockChildInsert;
  (globalThis as Record<string, unknown>).__mockSnapshotSelect = mockSnapshotSelect;
  (globalThis as Record<string, unknown>).__mockReconSelect = mockReconSelect;
  (globalThis as Record<string, unknown>).__mockUxSelect = mockUxSelect;
  (globalThis as Record<string, unknown>).__mockRunFreeSnapshot = mockRunFreeSnapshot;

  return {
    mockInsert,
    mockSnapshotSelect,
    mockReconSelect,
    mockUxSelect,
    mockRunFreeSnapshot,
    setInsertResult,
    setSnapshotQueryResult,
    setReconQueryResult,
    setUxQueryResult,
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'audits') {
        return {
          insert: (globalThis as Record<string, unknown>).__mockInsert,
          select: (globalThis as Record<string, unknown>).__mockSnapshotSelect,
        };
      }
      if (table === 'audit_recon') {
        return {
          insert: (globalThis as Record<string, unknown>).__mockChildInsert,
          select: (globalThis as Record<string, unknown>).__mockReconSelect,
        };
      }
      if (table === 'audit_domains') {
        return {
          insert: (globalThis as Record<string, unknown>).__mockChildInsert,
          select: (globalThis as Record<string, unknown>).__mockUxSelect,
        };
      }
      // Fallback
      return {
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn(() => ({ eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: null, error: null }) })),
      };
    }),
  },
}));

vi.mock('../services/pipeline.js', () => ({
  PipelineOrchestrator: class MockPipeline {
    constructor(public auditId: string) {}
    runFreeSnapshot() {
      return ((globalThis as Record<string, unknown>).__mockRunFreeSnapshot as (id: string) => unknown)(this.auditId);
    }
  },
}));

vi.mock('../middleware/rate-limit.js', () => ({
  createAuditLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  generalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  pipelineLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  snapshotPublicLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// Avoid real DNS in CI/sandbox; mirrors sync checks + URL normalization from production module.
vi.mock('../lib/public-http-url.js', () => {
  class PublicUrlNotAllowedError extends Error {
    override name = 'PublicUrlNotAllowedError';
    constructor(message: string) {
      super(message);
    }
  }
  return {
    PublicUrlNotAllowedError,
    validatePublicAuditUrl: async (urlString: string) => {
      let s = String(urlString).trim();
      if (!s.startsWith('http://') && !s.startsWith('https://')) s = `https://${s}`;
      let u: URL;
      try {
        u = new URL(s);
      } catch {
        throw new PublicUrlNotAllowedError('Invalid URL');
      }
      if (u.username || u.password) {
        throw new PublicUrlNotAllowedError('URL must not contain credentials');
      }
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        throw new PublicUrlNotAllowedError('Only http and https URLs are allowed');
      }
      const h = u.hostname.toLowerCase();
      if (h === 'localhost' || h.endsWith('.local')) {
        throw new PublicUrlNotAllowedError('Host is not allowed');
      }
      return u.href;
    },
  };
});

// ─── App setup ────────────────────────────────────────────────────────────────

import express from 'express';
import { snapshotRouter } from '../routes/snapshot.js';

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/snapshot', snapshotRouter);

  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve()); // port 0 = random available port
  });

  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(() => {
  server?.close();
});

beforeEach(() => {
  vi.clearAllMocks();
  // Reset defaults
  setInsertResult({ id: 'new-audit-id-001' });
  setSnapshotQueryResult(null);
  setReconQueryResult(null);
  setUxQueryResult(null);
});

// ─── POST /api/snapshot ───────────────────────────────────────────────────────

describe('POST /api/snapshot', () => {

  it('returns 202 with snapshot_token when URL is valid', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });

    expect(res.status).toBe(202);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe('running');
    expect(typeof body.snapshot_token).toBe('string');
    expect((body.snapshot_token as string).length).toBeGreaterThan(20); // UUID-like
  });

  it('normalizes URL without protocol prefix', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'example.com' }), // no https://
    });

    expect(res.status).toBe(202);
  });

  it('returns 400 when company_url is missing', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/company_url/i);
  });

  it('returns 400 when company_url is not a valid URL', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'not a url at all !@#$' }),
    });

    expect(res.status).toBe(400);
  });

  it('starts the pipeline asynchronously (does not block response)', async () => {
    // Pipeline takes 100ms — response should arrive before it resolves
    (mockRunFreeSnapshot as Mock).mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 100))
    );

    const start = Date.now();
    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'https://async-test.com' }),
    });
    const elapsed = Date.now() - start;

    expect(res.status).toBe(202);
    expect(elapsed).toBeLessThan(80); // Response arrives before 100ms pipeline delay
  });

  it('creates audit_recon and audit_domains child records', async () => {
    await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });

    const childInsert = (globalThis as Record<string, unknown>).__mockChildInsert as Mock;
    expect(childInsert).toHaveBeenCalledTimes(2); // audit_recon + audit_domains
  });

  it('returns 500 when DB insert fails', async () => {
    setInsertResult(null); // Simulate DB error

    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });

    expect(res.status).toBe(500);
  });
});

// ─── GET /api/snapshot/:token ─────────────────────────────────────────────────

describe('GET /api/snapshot/:token', () => {

  const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000'; // UUID-like

  it('returns 404 when token does not match any audit', async () => {
    setSnapshotQueryResult(null); // No record found

    const res = await fetch(`${baseUrl}/api/snapshot/${VALID_TOKEN}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 for obviously invalid (short) tokens', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot/abc`); // Too short

    expect(res.status).toBe(400);
  });

  it('returns { status: "recon" } while audit is still running', async () => {
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'recon',
      company_url: 'https://example.com',
      company_name: null,
      product_mode: 'free_snapshot',
    });

    const res = await fetch(`${baseUrl}/api/snapshot/${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe('recon');
    expect(body.snapshot_token).toBe(VALID_TOKEN);
    // Should NOT include full result yet
    expect(body.ux_score).toBeUndefined();
  });

  it('returns { status: "failed" } without details when audit failed', async () => {
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'failed',
      company_url: 'https://example.com',
      company_name: null,
      product_mode: 'free_snapshot',
    });

    const res = await fetch(`${baseUrl}/api/snapshot/${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.status).toBe('failed');
    expect(body.ux_score).toBeUndefined();
  });

  it('returns full preview when audit is completed', async () => {
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'completed',
      company_url: 'https://example.com',
      company_name: 'Test Company',
      product_mode: 'free_snapshot',
    });
    setReconQueryResult({
      company_name: 'Test Company',
      tech_stack: { cms: ['WordPress'] },
      location: 'London, UK',
    });
    setUxQueryResult({
      score: 4,
      label: 'Good',
      summary: 'Good overall UX with minor issues.',
      issues: [
        { id: 'i1', severity: 'medium', title: 'Slow hero', description: 'LCP issue', impact: 'Medium' },
        { id: 'i2', severity: 'low', title: 'Missing alt', description: 'Images', impact: 'Low' },
        { id: 'i3', severity: 'low', title: 'Small CTAs', description: 'Mobile', impact: 'Low' },
      ],
      quick_wins: [
        { id: 'q1', title: 'Add loading spinner', description: 'UX', effort: 'low', timeframe: '1h' },
        { id: 'q2', title: 'Fix nav contrast', description: 'a11y', effort: 'low', timeframe: '30m' },
        { id: 'q3', title: 'Add breadcrumbs', description: 'nav', effort: 'medium', timeframe: '2h' },
      ],
    });

    const res = await fetch(`${baseUrl}/api/snapshot/${VALID_TOKEN}`);

    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;

    expect(body.status).toBe('completed');
    expect(body.snapshot_token).toBe(VALID_TOKEN);
    expect(body.company_name).toBe('Test Company');
    expect(body.location).toBe('London, UK');
    expect(body.tech_stack).toEqual({ cms: ['WordPress'] });
    expect(body.ux_score).toBe(4);
    expect(body.ux_label).toBe('Good');
    expect(typeof body.ux_summary).toBe('string');
  });

  it('trims issues to max 2 in the GET response', async () => {
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'completed',
      company_url: 'https://example.com',
      company_name: null,
      product_mode: 'free_snapshot',
    });
    setReconQueryResult({ company_name: null, tech_stack: {}, location: null });
    setUxQueryResult({
      score: 2,
      label: 'Needs Work',
      summary: 'Multiple critical issues found.',
      issues: [
        { id: 'i1', severity: 'critical', title: 'Issue A', description: '', impact: '' },
        { id: 'i2', severity: 'high',     title: 'Issue B', description: '', impact: '' },
        { id: 'i3', severity: 'medium',   title: 'Issue C', description: '', impact: '' },
      ],
      quick_wins: [],
    });

    const res = await fetch(`${baseUrl}/api/snapshot/${VALID_TOKEN}`);
    const body = await res.json() as Record<string, string[]>;

    expect((body.issues as unknown[]).length).toBe(2);
    expect((body.quick_wins as unknown[]).length).toBe(0);
  });

  it('trims quick_wins to max 2 in the GET response', async () => {
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'completed',
      company_url: 'https://example.com',
      company_name: null,
      product_mode: 'free_snapshot',
    });
    setReconQueryResult({ company_name: null, tech_stack: {}, location: null });
    setUxQueryResult({
      score: 4,
      label: 'Good',
      summary: 'Decent UX.',
      issues: [],
      quick_wins: [
        { id: 'q1', title: 'Win 1', description: '', effort: 'low', timeframe: '1h' },
        { id: 'q2', title: 'Win 2', description: '', effort: 'low', timeframe: '1h' },
        { id: 'q3', title: 'Win 3', description: '', effort: 'low', timeframe: '1h' },
      ],
    });

    const res = await fetch(`${baseUrl}/api/snapshot/${VALID_TOKEN}`);
    const body = await res.json() as Record<string, unknown[]>;

    expect(body.quick_wins.length).toBe(2);
    expect((body.quick_wins[0] as Record<string, string>).title).toBe('Win 1');
    expect((body.quick_wins[1] as Record<string, string>).title).toBe('Win 2');
  });

  it('handles missing recon data gracefully (null company_name, empty tech_stack)', async () => {
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'completed',
      company_url: 'https://no-recon.com',
      company_name: null,
      product_mode: 'free_snapshot',
    });
    setReconQueryResult(null); // Recon failed or missing
    setUxQueryResult({ score: 3, label: 'Moderate', summary: 'Test.', issues: [], quick_wins: [] });

    const res = await fetch(`${baseUrl}/api/snapshot/${VALID_TOKEN}`);
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.status).toBe('completed');
    expect(body.company_name).toBeNull();
    expect(body.tech_stack).toEqual({});
    expect(body.location).toBeNull();
  });
});
