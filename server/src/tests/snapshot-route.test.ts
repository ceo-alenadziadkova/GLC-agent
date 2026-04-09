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
  mockGuestUpsert,
  mockGuestUpdate,
  mockAuditsUpdate,
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

  const mockGuestUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockGuestUpdate = vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }));
  (globalThis as Record<string, unknown>).__mockGuestUpsert = mockGuestUpsert;
  (globalThis as Record<string, unknown>).__mockGuestUpdate = mockGuestUpdate;

  const mockAuditsUpdate = vi.fn(() => {
    const o = {
      eq: vi.fn(() => o),
      is: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({ data: { id: 'new-audit-id-001' }, error: null }),
          ),
        })),
      })),
    };
    return o;
  });
  (globalThis as Record<string, unknown>).__mockAuditsUpdate = mockAuditsUpdate;

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
    mockGuestUpsert,
    mockGuestUpdate,
    mockAuditsUpdate,
  };
});

const { mockMaybeBuildCompetitorMini } = vi.hoisted(() => ({
  mockMaybeBuildCompetitorMini: vi.fn().mockResolvedValue(undefined),
}));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../lib/snapshot-competitor.js', () => ({
  maybeBuildCompetitorMini: (clientUrl: string, pages: unknown, timeoutMs: number) =>
    mockMaybeBuildCompetitorMini(clientUrl, pages, timeoutMs),
}));

const mockReadSnapshotCache = vi.hoisted(() => vi.fn().mockResolvedValue(null));

vi.mock('../snapshot/cache.js', () => ({
  normalizeSnapshotHost: (companyUrl: string) => {
    try {
      const u = new URL(companyUrl);
      return u.hostname.replace(/^www\./i, '').toLowerCase();
    } catch {
      return '';
    }
  },
  readSnapshotCache: (host: string) => mockReadSnapshotCache(host),
  writeSnapshotCache: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn((table: string) => {
      if (table === 'audits') {
        return {
          insert: (globalThis as Record<string, unknown>).__mockInsert,
          select: (globalThis as Record<string, unknown>).__mockSnapshotSelect,
          update: (globalThis as Record<string, unknown>).__mockAuditsUpdate,
          delete: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })),
        };
      }
      if (table === 'snapshot_guest_sessions') {
        return {
          upsert: (globalThis as Record<string, unknown>).__mockGuestUpsert,
          update: (globalThis as Record<string, unknown>).__mockGuestUpdate,
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
      if (table === 'snapshot_domain_cooldown') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
          upsert: vi.fn().mockResolvedValue({ error: null }),
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

vi.mock('../middleware/rate-limit.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../middleware/rate-limit.js')>();
  return {
    ...actual,
    snapshotPublicLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
    snapshotCompareLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  };
});

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }
    type AR = import('../middleware/auth.js').AuthRequest;
    (req as unknown as AR).userId = 'test-snapshot-user-id';
    const role = req.headers['x-test-role'];
    (req as unknown as AR).userEmail = role === 'consultant' ? 'consultant@test.example' : undefined;
    (req as unknown as AR).userIsAnonymous = false;
    next();
  },
  attachProfile: (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    type AR = import('../middleware/auth.js').AuthRequest;
    (req as unknown as AR).userRole = req.headers['x-test-role'] === 'consultant' ? 'consultant' : 'client';
    next();
  },
  rejectGuestFromPortal: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../lib/self-serve-audit-owner.js', () => ({
  resolveSelfServeAuditOwnerUserId: vi.fn().mockResolvedValue({ ok: true, userId: 'self-serve-owner-id' }),
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
import {
  noteSnapshotFreshFetchCompleted,
  resetSnapshotAbuseGuardsForTests,
} from '../snapshot/abuse-guards.js';

let server: Server;
let baseUrl: string;

const SNAPSHOT_TEST_AUTH = { Authorization: 'Bearer snapshot-test-jwt' } as const;

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
  resetSnapshotAbuseGuardsForTests();
  mockReadSnapshotCache.mockReset();
  mockReadSnapshotCache.mockResolvedValue(null);
  mockMaybeBuildCompetitorMini.mockClear();
  mockMaybeBuildCompetitorMini.mockResolvedValue(undefined);
  mockGuestUpsert.mockResolvedValue({ error: null });
  mockAuditsUpdate.mockImplementation(() => {
    const o = {
      eq: vi.fn(() => o),
      is: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(() =>
            Promise.resolve({ data: { id: 'new-audit-id-001' }, error: null }),
          ),
        })),
      })),
    };
    return o;
  });
  // Reset defaults
  setInsertResult({ id: 'new-audit-id-001' });
  setSnapshotQueryResult(null);
  setReconQueryResult(null);
  setUxQueryResult(null);
});

// ─── GET /api/snapshot/quota ──────────────────────────────────────────────────

describe('GET /api/snapshot/quota', () => {
  it('returns limit, remaining, period, and reset_at', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot/quota`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.limit).toBe(3);
    expect(body.period).toBe('day');
    expect(typeof body.remaining).toBe('number');
    expect(body.remaining).toBeGreaterThanOrEqual(0);
    expect(body.remaining).toBeLessThanOrEqual(3);
    expect(body.reset_at === null || typeof body.reset_at === 'string').toBe(true);
  });
});

// ─── POST /api/snapshot ───────────────────────────────────────────────────────

describe('POST /api/snapshot', () => {

  it('returns 202 when Authorization is missing (public guest flow)', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });
    expect(res.status).toBe(202);
  });

  it('returns 202 with snapshot_token when URL is valid', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
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
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'example.com' }), // no https://
    });

    expect(res.status).toBe(202);
  });

  it('returns 429 DOMAIN_FRESH_COOLDOWN when host was just scanned and cache miss', async () => {
    await noteSnapshotFreshFetchCompleted('example.com');
    mockReadSnapshotCache.mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'https://example.com/path' }),
    });

    expect(res.status).toBe(429);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('DOMAIN_FRESH_COOLDOWN');
    expect(typeof body.retry_after_seconds).toBe('number');
  });

  it('allows POST when cache hit exists even if fresh cooldown is active', async () => {
    await noteSnapshotFreshFetchCompleted('example.com');
    mockReadSnapshotCache.mockResolvedValue({
      version: 1,
      site_profile: {
        siteType: 'unknown',
        industry: 'unknown',
        conversionModel: 'unknown',
        primaryOffer: '',
        shortLabel: '',
        audienceGuess: 'unknown',
        businessSignals: [],
        classificationConfidence: 0.2,
        classificationConfidenceBand: 'low',
        companyNameGuess: null,
        locationGuess: null,
      },
      audit: {
        overallScore: 50,
        categoryScores: { ux_clarity: 50, conversion_readiness: 50, ai_readiness: 50, technical_basics: 50 },
        ruleResults: [],
        scanBasis: 'test',
        signalsFound: [],
        scanConfidenceBand: 'medium',
      },
      tech_stack: {},
      pages_crawled: [],
      company_name: null,
      location: null,
      languages: [],
      contact_info: { emails: [], phones: [], addresses: [] },
    });

    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });

    expect(res.status).toBe(202);
  });

  it('returns 400 when company_url is missing', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toMatch(/company_url/i);
  });

  it('returns 400 when company_url is not a valid URL', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
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
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'https://async-test.com' }),
    });
    const elapsed = Date.now() - start;

    expect(res.status).toBe(202);
    expect(elapsed).toBeLessThan(80); // Response arrives before 100ms pipeline delay
  });

  it('creates audit_recon and audit_domains child records', async () => {
    await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });

    const childInsert = (globalThis as Record<string, unknown>).__mockChildInsert as Mock;
    expect(childInsert).toHaveBeenCalledTimes(2); // audit_recon + audit_domains
  });

  it('returns 500 when DB insert fails', async () => {
    setInsertResult(null); // Simulate DB error

    const res = await fetch(`${baseUrl}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });

    expect(res.status).toBe(500);
  });
});

// ─── GET /api/snapshot/:token ─────────────────────────────────────────────────

describe('GET /api/snapshot/:token', () => {

  const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000'; // UUID-like

  /** `GET /api/snapshot/:token` requires persisted `raw_data.snapshot_deterministic.overall_score` (real pipeline shape). */
  function rawDataDeterministic(overallScore: number): Record<string, unknown> {
    return {
      raw_data: {
        snapshot_deterministic: {
          overall_score: overallScore,
        },
      },
    };
  }

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

  it('returns { status: "failed", code: "SNAPSHOT_FAILED" } when audit failed', async () => {
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
    expect(body.code).toBe('SNAPSHOT_FAILED');
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
      ...rawDataDeterministic(65),
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
      ...rawDataDeterministic(30),
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
      ...rawDataDeterministic(65),
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
    setUxQueryResult({
      score: 3,
      label: 'Moderate',
      summary: 'Test.',
      issues: [],
      quick_wins: [],
      ...rawDataDeterministic(45),
    });

    const res = await fetch(`${baseUrl}/api/snapshot/${VALID_TOKEN}`);
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(body.status).toBe('completed');
    expect(body.company_name).toBeNull();
    expect(body.tech_stack).toEqual({});
    expect(body.location).toBeNull();
  });

  it('does not fetch competitor data unless compare=1', async () => {
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'completed',
      company_url: 'https://example.com',
      company_name: null,
      product_mode: 'free_snapshot',
    });
    setReconQueryResult({
      company_name: null,
      tech_stack: {},
      location: null,
      pages_crawled: [{ url: 'https://example.com/', links: { external: ['https://other.com'] } }],
    });
    setUxQueryResult({
      score: 4,
      label: 'Good',
      summary: 'Ok.',
      issues: [],
      quick_wins: [],
      ...rawDataDeterministic(65),
    });

    const res = await fetch(`${baseUrl}/api/snapshot/${VALID_TOKEN}`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.competitor_mini).toBeUndefined();
    expect(mockMaybeBuildCompetitorMini).not.toHaveBeenCalled();
  });

  it('fetches competitor mini when compare=1', async () => {
    const mini = {
      competitor_name: 'other.com',
      competitor_url: 'https://other.com',
      comparisons: [
        { metric: 'https', client_val: true, comp_val: true, winner: 'tie' as const, label: 'HTTPS' },
      ],
      data_source: 'auto_detected' as const,
      confidence: 'high' as const,
    };
    mockMaybeBuildCompetitorMini.mockResolvedValue(mini);

    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'completed',
      company_url: 'https://example.com',
      company_name: null,
      product_mode: 'free_snapshot',
    });
    setReconQueryResult({
      company_name: null,
      tech_stack: {},
      location: null,
      pages_crawled: [],
    });
    setUxQueryResult({
      score: 4,
      label: 'Good',
      summary: 'Ok.',
      issues: [],
      quick_wins: [],
      ...rawDataDeterministic(65),
    });

    const res = await fetch(`${baseUrl}/api/snapshot/${VALID_TOKEN}?compare=1`);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(mockMaybeBuildCompetitorMini).toHaveBeenCalledTimes(1);
    expect(body.competitor_mini).toEqual(mini);
  });
});

// ─── POST /api/snapshot/claim ────────────────────────────────────────────────

describe('POST /api/snapshot/claim', () => {
  const CLAIM_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

  it('returns 401 without Authorization', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot_token: CLAIM_TOKEN }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when snapshot_token is missing', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when audit is not found', async () => {
    setSnapshotQueryResult(null);
    const res = await fetch(`${baseUrl}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ snapshot_token: CLAIM_TOKEN }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 200 with already_claimed when client_id matches user', async () => {
    setSnapshotQueryResult({
      id: 'audit-claim-1',
      client_id: 'test-snapshot-user-id',
      snapshot_token: CLAIM_TOKEN,
      product_mode: 'free_snapshot',
    });
    const res = await fetch(`${baseUrl}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ snapshot_token: CLAIM_TOKEN }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.already_claimed).toBe(true);
    expect(body.audit_id).toBe('audit-claim-1');
    expect(mockAuditsUpdate).not.toHaveBeenCalled();
  });

  it('returns 409 when snapshot is linked to another user', async () => {
    setSnapshotQueryResult({
      id: 'audit-claim-1',
      client_id: 'someone-else-id',
      snapshot_token: CLAIM_TOKEN,
      product_mode: 'free_snapshot',
    });
    const res = await fetch(`${baseUrl}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ snapshot_token: CLAIM_TOKEN }),
    });
    expect(res.status).toBe(409);
    expect(mockAuditsUpdate).not.toHaveBeenCalled();
  });

  it('returns 200 and runs audit update when client_id is null', async () => {
    setSnapshotQueryResult({
      id: 'audit-claim-1',
      client_id: null,
      snapshot_token: CLAIM_TOKEN,
      product_mode: 'free_snapshot',
    });
    const res = await fetch(`${baseUrl}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ snapshot_token: CLAIM_TOKEN }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.already_claimed).toBe(false);
    expect(mockAuditsUpdate).toHaveBeenCalled();
    expect(mockGuestUpdate).toHaveBeenCalled();
  });
});
