import { afterAll, beforeAll, beforeEach, vi } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';
import { snapshotRouter } from '../routes/snapshot.js';
import { noteSnapshotFreshFetchCompleted, resetSnapshotAbuseGuardsForTests } from '../snapshot/abuse-guards.js';

export type { Mock } from 'vitest';
export const markSnapshotFreshFetchCompleted = noteSnapshotFreshFetchCompleted;

const hoistedState = vi.hoisted(() => {
  let insertResult: { id: string } | null = { id: 'new-audit-id-001' };
  const setInsertResult = (v: { id: string } | null) => {
    insertResult = v;
  };

  const mockInsertSingle = vi.fn(() =>
    Promise.resolve({ data: insertResult, error: insertResult ? null : new Error('insert failed') }),
  );
  const mockInsert = vi.fn(() => ({
    select: vi.fn(() => ({ single: mockInsertSingle })),
  }));

  let snapshotQueryResult: Record<string, unknown> | null = null;
  let reconQueryResult: Record<string, unknown> | null = null;
  let uxQueryResult: Record<string, unknown> | null = null;

  const setSnapshotQueryResult = (v: Record<string, unknown> | null) => {
    snapshotQueryResult = v ? { created_at: new Date().toISOString(), ...v } : null;
  };
  const setReconQueryResult = (v: Record<string, unknown> | null) => {
    reconQueryResult = v;
  };
  const setUxQueryResult = (v: Record<string, unknown> | null) => {
    uxQueryResult = v;
  };

  const mockSnapshotSelect = vi.fn(() => ({
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() =>
      Promise.resolve({
        data: snapshotQueryResult,
        error: snapshotQueryResult ? null : { code: 'PGRST116' },
      }),
    ),
  }));

  const mockReconSelect = vi.fn(() => ({
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: reconQueryResult, error: null })),
  }));

  const mockUxSelect = vi.fn(() => ({
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: uxQueryResult, error: null })),
  }));

  const mockChildInsert = vi.fn().mockResolvedValue({ error: null });
  const mockRunFreeSnapshot = vi.fn().mockResolvedValue(undefined);
  const mockGuestUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockGuestUpdate = vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }));

  const mockAuditsUpdate = vi.fn(() => {
    const o = {
      eq: vi.fn(() => o),
      is: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'new-audit-id-001' }, error: null })),
        })),
      })),
    };
    return o;
  });

  (globalThis as Record<string, unknown>).__mockInsert = mockInsert;
  (globalThis as Record<string, unknown>).__mockChildInsert = mockChildInsert;
  (globalThis as Record<string, unknown>).__mockSnapshotSelect = mockSnapshotSelect;
  (globalThis as Record<string, unknown>).__mockReconSelect = mockReconSelect;
  (globalThis as Record<string, unknown>).__mockUxSelect = mockUxSelect;
  (globalThis as Record<string, unknown>).__mockRunFreeSnapshot = mockRunFreeSnapshot;
  (globalThis as Record<string, unknown>).__mockGuestUpsert = mockGuestUpsert;
  (globalThis as Record<string, unknown>).__mockGuestUpdate = mockGuestUpdate;
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

export const {
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
} = hoistedState;

const competitorHoisted = vi.hoisted(() => ({
  mockMaybeBuildCompetitorMini: vi.fn().mockResolvedValue(undefined),
  mockCompareSiteMetricsByUrl: vi.fn().mockResolvedValue(undefined),
}));
export const { mockMaybeBuildCompetitorMini, mockCompareSiteMetricsByUrl } = competitorHoisted;

vi.mock('../lib/snapshot-competitor.js', () => ({
  maybeBuildCompetitorMini: (clientUrl: string, pages: unknown, timeoutMs: number) =>
    mockMaybeBuildCompetitorMini(clientUrl, pages, timeoutMs),
  compareSiteMetricsByUrl: (params: { selfUrl: string; competitorUrl: string; timeoutMs: number }) =>
    mockCompareSiteMetricsByUrl(params),
}));

const readCacheHoisted = vi.hoisted(() => vi.fn().mockResolvedValue(null));
export const mockReadSnapshotCache = readCacheHoisted;

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

vi.mock('../middleware/rate-limit.js', async importOriginal => {
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
  attachProfile: (req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => {
    type AR = import('../middleware/auth.js').AuthRequest;
    (req as unknown as AR).userRole = req.headers['x-test-role'] === 'consultant' ? 'consultant' : 'client';
    next();
  },
  rejectGuestFromPortal: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../lib/self-serve-audit-owner.js', () => ({
  resolveSelfServeAuditOwnerUserId: vi.fn().mockResolvedValue({ ok: true, userId: 'self-serve-owner-id' }),
}));

vi.mock('../lib/public-http-url.js', async () => {
  const { API_ERROR_CODES } = await import('../config/api-error-codes.js');
  const { resolvePublicUrlErrorMessage } = await import('../config/public-url-error-message.js');
  class PublicUrlNotAllowedError extends Error {
    override name = 'PublicUrlNotAllowedError';
    readonly code: (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
    constructor(code: (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES]) {
      super(resolvePublicUrlErrorMessage(code));
      this.code = code;
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
        throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_INVALID);
      }
      if (u.username || u.password) throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_CREDENTIALS_NOT_ALLOWED);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_PROTOCOL_NOT_ALLOWED);
      const h = u.hostname.toLowerCase();
      if (h === 'localhost' || h.endsWith('.local')) throw new PublicUrlNotAllowedError(API_ERROR_CODES.PUBLIC_URL_HOST_NOT_ALLOWED);
      return u.href;
    },
  };
});

let server: Server;
let baseUrl = '';
export const SNAPSHOT_TEST_AUTH = { Authorization: 'Bearer snapshot-test-jwt' } as const;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/snapshot', snapshotRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
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
  mockCompareSiteMetricsByUrl.mockClear();
  mockCompareSiteMetricsByUrl.mockResolvedValue(undefined);
  mockGuestUpsert.mockResolvedValue({ error: null });
  mockAuditsUpdate.mockImplementation(() => {
    const o = {
      eq: vi.fn(() => o),
      is: vi.fn(() => ({
        select: vi.fn(() => ({
          maybeSingle: vi.fn(() => Promise.resolve({ data: { id: 'new-audit-id-001' }, error: null })),
        })),
      })),
    };
    return o;
  });
  setInsertResult({ id: 'new-audit-id-001' });
  setSnapshotQueryResult(null);
  setReconQueryResult(null);
  setUxQueryResult(null);
});

export function getSnapshotBaseUrl(): string {
  return baseUrl;
}

export function rawDataDeterministic(overallScore: number): Record<string, unknown> {
  return {
    raw_data: {
      snapshot_deterministic: {
        overall_score: overallScore,
      },
    },
  };
}
