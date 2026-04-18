import { describe, expect, it } from 'vitest';
import {
  SNAPSHOT_TEST_AUTH,
  getSnapshotBaseUrl,
  mockCompareSiteMetricsByUrl,
  setSnapshotQueryResult,
} from './snapshot-route.test-setup.js';

describe('POST /api/snapshot/compare', () => {
  it('returns 401 without Authorization', async () => {
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ self_url: 'https://mine.com', competitor_url: 'https://other.com' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when self_url is missing', async () => {
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ competitor_url: 'https://other.com' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when competitor_url is missing', async () => {
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ self_url: 'https://mine.com' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns competitor_mini when compare succeeds', async () => {
    mockCompareSiteMetricsByUrl.mockResolvedValue({
      competitor_name: 'other.com',
      competitor_url: 'https://other.com',
      comparisons: [{ metric: 'https', client_val: true, comp_val: true, winner: 'tie', label: 'HTTPS' }],
      data_source: 'auto_detected',
      confidence: 'high',
    });
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ self_url: 'https://mine.com', competitor_url: 'https://other.com' }),
    });
    expect(res.status).toBe(200);
  });

  it('returns null competitor_mini when compare has no usable metrics', async () => {
    mockCompareSiteMetricsByUrl.mockResolvedValue(undefined);
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ self_url: 'https://mine.com', competitor_url: 'https://other.com' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.competitor_mini).toBeNull();
  });
});

describe('POST /api/snapshot/claim', () => {
  const CLAIM_TOKEN = '550e8400-e29b-41d4-a716-446655440000';

  it('returns 401 without Authorization', async () => {
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ snapshot_token: CLAIM_TOKEN }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when audit is not found', async () => {
    setSnapshotQueryResult(null);
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ snapshot_token: CLAIM_TOKEN }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 when snapshot_token is missing', async () => {
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('returns 410 when claim token is expired', async () => {
    setSnapshotQueryResult({
      id: 'audit-claim-expired',
      client_id: null,
      snapshot_token: CLAIM_TOKEN,
      product_mode: 'free_snapshot',
      created_at: '2000-01-01T00:00:00.000Z',
    });
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ snapshot_token: CLAIM_TOKEN }),
    });
    expect(res.status).toBe(410);
  });

  it('returns 200 with already_claimed when client_id matches user', async () => {
    setSnapshotQueryResult({
      id: 'audit-claim-1',
      client_id: 'test-snapshot-user-id',
      snapshot_token: CLAIM_TOKEN,
      product_mode: 'free_snapshot',
    });
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ snapshot_token: CLAIM_TOKEN }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.already_claimed).toBe(true);
  });

  it('returns 409 when snapshot is linked to another user', async () => {
    setSnapshotQueryResult({
      id: 'audit-claim-1',
      client_id: 'someone-else-id',
      snapshot_token: CLAIM_TOKEN,
      product_mode: 'free_snapshot',
    });
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ snapshot_token: CLAIM_TOKEN }),
    });
    expect(res.status).toBe(409);
  });

  it('returns 200 and runs audit update when client_id is null', async () => {
    setSnapshotQueryResult({
      id: 'audit-claim-1',
      client_id: null,
      snapshot_token: CLAIM_TOKEN,
      product_mode: 'free_snapshot',
    });
    const res = await fetch(`${getSnapshotBaseUrl()}/api/snapshot/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...SNAPSHOT_TEST_AUTH },
      body: JSON.stringify({ snapshot_token: CLAIM_TOKEN }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.already_claimed).toBe(false);
  });
});
