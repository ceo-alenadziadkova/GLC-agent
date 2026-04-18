import { describe, expect, it } from 'vitest';
import {
  Mock,
  SNAPSHOT_TEST_AUTH,
  getSnapshotBaseUrl,
  markSnapshotFreshFetchCompleted,
  mockReadSnapshotCache,
  setInsertResult,
} from './snapshot-route.test-setup.js';

describe('GET /api/snapshot/quota', () => {
  it('returns limit, remaining, period, and reset_at', async () => {
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/quota`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.limit).toBe(3);
    expect(body.period).toBe('day');
    expect(typeof body.remaining).toBe('number');
    expect(body.remaining).toBeGreaterThanOrEqual(0);
    expect(body.remaining).toBeLessThanOrEqual(3);
    expect(body.reset_at === null || typeof body.reset_at === 'string').toBe(true);
  });
});

describe('POST /api/snapshot', () => {
  it('returns 202 when Authorization is missing (public guest flow)', async () => {
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });
    expect(res.status).toBe(202);
  });

  it('returns 202 with snapshot_token when URL is valid', async () => {
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });
    expect(res.status).toBe(202);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe('running');
    expect(typeof body.snapshot_token).toBe('string');
  });

  it('normalizes URL without protocol prefix', async () => {
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'example.com' }),
    });
    expect(res.status).toBe(202);
  });

  it('returns 429 DOMAIN_FRESH_COOLDOWN when host was just scanned and cache miss', async () => {
    await markSnapshotFreshFetchCompleted('example.com');
    mockReadSnapshotCache.mockResolvedValue(null);
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'https://example.com/path' }),
    });
    expect(res.status).toBe(429);
  });

  it('allows POST when cache hit exists even if fresh cooldown is active', async () => {
    await markSnapshotFreshFetchCompleted('example.com');
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
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });
    expect(res.status).toBe(202);
  });

  it('returns 400 when company_url is missing', async () => {
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('SNAPSHOT_COMPANY_URL_REQUIRED');
  });

  it('returns 400 when company_url is not a valid URL', async () => {
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'not a url at all !@#$' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PUBLIC_URL_INVALID');
  });

  it('starts pipeline asynchronously', async () => {
    const run = (globalThis as Record<string, unknown>).__mockRunFreeSnapshot as Mock;
    run.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const start = Date.now();
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'https://async-test.com' }),
    });
    expect(res.status).toBe(202);
    expect(Date.now() - start).toBeLessThan(80);
  });

  it('creates audit_recon and audit_domains child records', async () => {
    await fetch(`${getSnapshotBaseUrl()}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });
    const childInsert = (globalThis as Record<string, unknown>).__mockChildInsert as Mock;
    expect(childInsert).toHaveBeenCalledTimes(2);
  });

  it('returns 500 when DB insert fails', async () => {
    setInsertResult(null);
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });
    expect(res.status).toBe(500);
  });
});
