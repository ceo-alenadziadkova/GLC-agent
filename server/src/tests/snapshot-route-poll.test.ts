import { describe, expect, it } from 'vitest';
import {
  getSnapshotBaseUrl,
  rawDataDeterministic,
  setReconQueryResult,
  setSnapshotQueryResult,
  setUxQueryResult,
} from './snapshot-route.test-setup.js';

describe('GET /api/snapshot/:token', () => {
  const VALID_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

  it('returns 404 when token does not match any audit', async () => {
    setSnapshotQueryResult(null);
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/${VALID_TOKEN}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid token', async () => {
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/abc`);
    expect(res.status).toBe(400);
  });

  it('returns 410 when snapshot token is expired', async () => {
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'completed',
      company_url: 'https://example.com',
      company_name: null,
      product_mode: 'free_snapshot',
      created_at: '2000-01-01T00:00:00.000Z',
    });
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/${VALID_TOKEN}`);
    expect(res.status).toBe(410);
  });

  it('returns running while audit is in progress', async () => {
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'recon',
      company_url: 'https://example.com',
      product_mode: 'free_snapshot',
    });
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/${VALID_TOKEN}`);
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.status).toBe('recon');
  });

  it('returns failed payload when audit failed', async () => {
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'failed',
      company_url: 'https://example.com',
      company_name: null,
      product_mode: 'free_snapshot',
    });
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/${VALID_TOKEN}`);
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.status).toBe('failed');
    expect(body.code).toBe('SNAPSHOT_FAILED');
  });

  it('returns full preview when audit is completed', async () => {
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'completed',
      company_url: 'https://example.com',
      company_name: 'Test Company',
      product_mode: 'free_snapshot',
    });
    setReconQueryResult({ company_name: 'Test Company', tech_stack: { cms: ['WordPress'] }, location: 'London, UK' });
    setUxQueryResult({
      score: 4,
      label: 'Good',
      summary: 'Good overall UX with minor issues.',
      issues: [],
      quick_wins: [],
      ...rawDataDeterministic(65),
    });
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/${VALID_TOKEN}`);
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.status).toBe('completed');
    expect(body.company_name).toBe('Test Company');
  });

  it('trims issues to max 2', async () => {
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
        { id: 'i2', severity: 'high', title: 'Issue B', description: '', impact: '' },
        { id: 'i3', severity: 'medium', title: 'Issue C', description: '', impact: '' },
      ],
      quick_wins: [],
      ...rawDataDeterministic(30),
    });
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/${VALID_TOKEN}`);
    const body = (await res.json()) as Record<string, unknown[]>;
    expect(body.issues.length).toBe(2);
  });

  it('trims quick_wins to max 2', async () => {
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
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/${VALID_TOKEN}`);
    const body = (await res.json()) as Record<string, unknown[]>;
    expect(body.quick_wins.length).toBe(2);
  });

  it('handles missing recon data gracefully', async () => {
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'completed',
      company_url: 'https://no-recon.com',
      company_name: null,
      product_mode: 'free_snapshot',
    });
    setReconQueryResult(null);
    setUxQueryResult({
      score: 3,
      label: 'Moderate',
      summary: 'Test.',
      issues: [],
      quick_wins: [],
      ...rawDataDeterministic(45),
    });
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/${VALID_TOKEN}`);
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.company_name).toBeNull();
    expect(body.tech_stack).toEqual({});
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
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/${VALID_TOKEN}`);
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.competitor_mini).toBeUndefined();
  });

  it('fetches competitor mini when compare=1', async () => {
    const { mockMaybeBuildCompetitorMini } = await import('./snapshot-route.test-setup.js');
    const mini = {
      competitor_name: 'other.com',
      competitor_url: 'https://other.com',
      comparisons: [{ metric: 'https', client_val: true, comp_val: true, winner: 'tie', label: 'HTTPS' }],
      data_source: 'auto_detected',
      confidence: 'high',
    };
    mockMaybeBuildCompetitorMini.mockResolvedValue(mini);
    setSnapshotQueryResult({
      id: 'audit-001',
      status: 'completed',
      company_url: 'https://example.com',
      company_name: null,
      product_mode: 'free_snapshot',
    });
    setReconQueryResult({ company_name: null, tech_stack: {}, location: null, pages_crawled: [] });
    setUxQueryResult({
      score: 4,
      label: 'Good',
      summary: 'Ok.',
      issues: [],
      quick_wins: [],
      ...rawDataDeterministic(65),
    });
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/${VALID_TOKEN}?compare=1`);
    const body = (await res.json()) as Record<string, unknown>;
    expect(res.status).toBe(200);
    expect(body.competitor_mini).toEqual(mini);
  });
});
