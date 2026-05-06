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

const {
  setRequestUserId,
  resetSupabaseMock,
  setStrategyRow,
  setDomainsShouldThrow,
  setDomainsInvalidForPdf,
  setNoPublicWebsite,
  setBriefResponses,
  setPdfMode,
  getTableCallCount,
} = vi.hoisted(() => {
  const domainUx = {
    audit_id: 'audit-report-001',
    domain_key: 'ux_conversion',
    phase_number: 4,
    status: 'completed',
    version: 1,
    score: 3,
    label: 'Moderate',
    summary: 'UX summary',
    quick_wins: [{ id: 'qw-1', title: 'Fix hero CTA', description: 'Update CTA copy and placement', timeframe: '1 week' }],
    recommendations: [],
  };

  const auditBaseLocal: Record<string, unknown> = {
    id: 'audit-report-001',
    company_url: 'https://example.com',
    company_name: null,
    created_at: '2025-01-15T10:00:00.000Z',
    overall_score: 3.8,
    product_mode: 'express',
    user_id: 'user-owner',
    client_id: 'user-client',
    no_public_website: false,
  };

  let requestUserId = 'user-owner';
  let strategyRow: Record<string, unknown> | null = null;
  let domainsShouldThrow = false;
  let domainsInvalidForPdf = false;
  let briefResponses: Record<string, unknown> | null = null;
  let pdfMode: 'ok' | 'timeout' | 'size' = 'ok';
  const tableCallCount: Record<string, number> = {};
  const setRequestUserId = (id: string) => {
    requestUserId = id;
  };
  const setStrategyRow = (row: Record<string, unknown> | null) => {
    strategyRow = row;
  };
  const setDomainsShouldThrow = (v: boolean) => {
    domainsShouldThrow = v;
  };
  const setDomainsInvalidForPdf = (v: boolean) => {
    domainsInvalidForPdf = v;
  };
  const setNoPublicWebsite = (v: boolean) => {
    auditBaseLocal.no_public_website = v;
  };
  const setBriefResponses = (row: Record<string, unknown> | null) => {
    briefResponses = row;
  };
  const setPdfMode = (mode: 'ok' | 'timeout' | 'size') => {
    pdfMode = mode;
  };

  const incrementTableCall = (table: string) => {
    tableCallCount[table] = (tableCallCount[table] ?? 0) + 1;
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
    order: vi.fn(() => {
      if (domainsShouldThrow) throw new Error('domains failed');
      if (domainsInvalidForPdf) {
        return Promise.resolve({
          data: [{ ...domainUx, issues: [{ id: '', severity: 'high', title: 'Broken shape', description: 'x', impact: 'y' }] }],
          error: null,
        });
      }
      return Promise.resolve({ data: [domainUx], error: null });
    }),
  });

  const makeSingleChain = (data: unknown) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error: null })),
  });

  const mockFrom = vi.fn((table: string) => {
    incrementTableCall(table);
    if (table === 'audits') return makeAuditsChain();
    if (table === 'audit_domains') return makeDomainsChain();
    if (table === 'audit_recon') return makeSingleChain({ company_name: 'Example Ltd', industry: 'SaaS' });
    if (table === 'audit_strategy') return makeSingleChain(strategyRow);
    if (table === 'intake_brief') return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: briefResponses ? { responses: briefResponses } : null, error: null })),
    };
    if (table === 'notifications') {
      return { insert: vi.fn(() => Promise.resolve({ error: null })) };
    }
    return makeSingleChain(null);
  });

  const resetSupabaseMock = () => {
    mockFrom.mockClear();
    Object.keys(tableCallCount).forEach(key => delete tableCallCount[key]);
  };
  const getTableCallCount = (table: string) => tableCallCount[table] ?? 0;

  (globalThis as Record<string, unknown>).__reportsGetUserId = () => requestUserId;
  (globalThis as Record<string, unknown>).__reportsMockFrom = mockFrom;
  (globalThis as Record<string, unknown>).__reportsGetPdfMode = () => pdfMode;

  return {
    setRequestUserId,
    resetSupabaseMock,
    setStrategyRow,
    setDomainsShouldThrow,
    setDomainsInvalidForPdf,
    setNoPublicWebsite,
    setBriefResponses,
    setPdfMode,
    getTableCallCount,
  };
});

vi.mock('../services/supabase.js', () => ({
  supabase: { from: (globalThis as Record<string, unknown>).__reportsMockFrom as () => unknown },
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userId = ((globalThis as Record<string, unknown>).__reportsGetUserId as () => string)();
    next();
  },
  attachProfile: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userRole = 'client';
    next();
  },
  rejectGuestFromPortal: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/rate-limit.js', () => ({
  generalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  reportPdfLimiter: (
    req: { query?: Record<string, string> },
    res: { status: (code: number) => { json: (body: unknown) => void } },
    next: () => void,
  ) => {
    const format = String(req.query?.format ?? 'json');
    if (format !== 'pdf') {
      next();
      return;
    }
    const key = ((globalThis as Record<string, unknown>).__reportsGetUserId as () => string)();
    const map = (globalThis as Record<string, unknown>).__reportsPdfRateMap as Map<string, number>;
    const count = (map.get(key) ?? 0) + 1;
    map.set(key, count);
    if (count > 12) {
      res.status(429).json({ code: 'REPORT_PDF_RATE_LIMITED' });
      return;
    }
    next();
  },
}));

vi.mock('../services/pdf-generator.js', () => ({
  pdfGenerator: {
    generate: vi.fn(async () => {
      const mode = ((globalThis as Record<string, unknown>).__reportsGetPdfMode as () => 'ok' | 'timeout' | 'size')();
      if (mode === 'timeout') {
        const { PdfRenderTimeoutError } = await import('../services/pdf-generator/pdf-generator-class.js');
        throw new PdfRenderTimeoutError(12_000);
      }
      if (mode === 'size') {
        const { PdfRenderSizeLimitError } = await import('../services/pdf-generator/pdf-generator-class.js');
        throw new PdfRenderSizeLimitError(1_024, 2_048);
      }
      return Buffer.from('%PDF-1.4 mock');
    }),
  },
}));

(globalThis as Record<string, unknown>).__reportsPdfRateMap = new Map<string, number>();

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
  setStrategyRow(null);
  setDomainsShouldThrow(false);
  setDomainsInvalidForPdf(false);
  setNoPublicWebsite(false);
  setBriefResponses(null);
  setPdfMode('ok');
  ((globalThis as Record<string, unknown>).__reportsPdfRateMap as Map<string, number>).clear();
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
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('REPORTS_AUDIT_NOT_FOUND');
    expect(getTableCallCount('audits')).toBe(1);
    expect(getTableCallCount('audit_recon')).toBe(0);
    expect(getTableCallCount('audit_domains')).toBe(0);
    expect(getTableCallCount('audit_strategy')).toBe(0);
    expect(getTableCallCount('intake_brief')).toBe(0);
  });

  it('returns low confidence coverage metadata for no-site audits', async () => {
    setNoPublicWebsite(true);
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=json`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    const coverage = body.coverage as Record<string, unknown>;
    expect(coverage.confidence_level).toBe('low');
    expect(String(coverage.confidence_note)).toContain('No public website');
  });

  it('returns idea-stage readiness metadata and renders section in markdown', async () => {
    setBriefResponses({
      f_idea_1: { value: 'Mostly my assumption for now', source: 'client' },
      f_idea_2: { value: 'Broad audience for now', source: 'client' },
      f_idea_3: { value: ['Not ready to run tests yet'], source: 'client' },
      f_idea_4: { value: 'Budget', source: 'client' },
    });
    const jsonRes = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=json`);
    expect(jsonRes.status).toBe(200);
    const body = (await jsonRes.json()) as Record<string, unknown>;
    const idea = body.idea_stage_readiness as Record<string, unknown>;
    expect(idea.enabled).toBe(true);
    expect(idea.validation_signal).toBe('weak');
    expect(idea.gtm_test_ready).toBe(false);

    const mdRes = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=markdown`);
    expect(mdRes.status).toBe(200);
    const md = await mdRes.text();
    expect(md).toContain('Idea-stage readiness');
    expect(md).toContain('Validation signal: weak');
  });

  it('renders strategy executive summary in markdown when strategy row exists', async () => {
    setStrategyRow({
      audit_id: AUDIT_ID,
      executive_summary: 'Strategy summary for regression fixture.',
      overall_score: 4,
      quick_wins: [{ title: 'Tighten landing CTA' }],
      medium_term: [],
      strategic: [],
      scorecard: [],
    });

    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=markdown`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Strategy summary for regression fixture.');
  });

  it('returns 500 with reports generate failed code on unhandled route error', async () => {
    setDomainsShouldThrow(true);
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=json`);
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('REPORTS_GENERATE_FAILED');
  });

  it('returns 400 for unsupported format with structured reason', async () => {
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=xml`);
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('REPORTS_GENERATE_FAILED');
    const details = body.details as Record<string, unknown>;
    expect(details.reason).toBe('unsupported_format');
  });

  it('returns hardened headers for PDF response', async () => {
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=pdf`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
    expect(res.headers.get('cache-control')).toContain('no-store');
    expect(res.headers.get('pragma')).toBe('no-cache');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('maps PDF timeout to 504 with structured reason', async () => {
    setPdfMode('timeout');
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=pdf`);
    expect(res.status).toBe(504);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('REPORTS_GENERATE_FAILED');
    const details = body.details as Record<string, unknown>;
    expect(details.reason).toBe('pdf_render_timeout');
  });

  it('maps PDF oversized render to 413 with structured reason', async () => {
    setPdfMode('size');
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=pdf`);
    expect(res.status).toBe(413);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('REPORTS_GENERATE_FAILED');
    const details = body.details as Record<string, unknown>;
    expect(details.reason).toBe('pdf_render_size_limit');
  });

  it('returns 422 when PDF payload fails runtime schema guard', async () => {
    setDomainsInvalidForPdf(true);
    const res = await fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=pdf`);
    expect(res.status).toBe(422);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('REPORTS_GENERATE_FAILED');
    const details = body.details as Record<string, unknown>;
    expect(details.reason).toBe('pdf_input_invalid');
  });

  it('throttles repeated PDF exports with dedicated limiter', async () => {
    const requests = Array.from({ length: 13 }, () => fetch(`${baseUrl}/api/audits/${AUDIT_ID}/report?format=pdf`));
    const responses = await Promise.all(requests);
    const throttled = responses.filter(r => r.status === 429);
    expect(throttled.length).toBeGreaterThan(0);
    const first429 = throttled[0];
    const body = (await first429.json()) as Record<string, unknown>;
    expect(body.code).toBe('REPORT_PDF_RATE_LIMITED');
  });
});
