import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';
import { snapshotOperatorRouter } from '../routes/snapshot/operator.js';
import { SNAPSHOT_OPERATOR_TOKEN_HEADER } from '../config/snapshot-operator.js';

const { mockDeleteSnapshotDomainCache, mockSnapshotSharedMetricsForOperator, mockSnapshotMetricsSnapshot } =
  vi.hoisted(() => ({
    mockDeleteSnapshotDomainCache: vi.fn().mockResolvedValue(true),
    mockSnapshotSharedMetricsForOperator: vi.fn().mockResolvedValue({ shared_counter: 7 }),
    mockSnapshotMetricsSnapshot: vi.fn(() => ({ in_memory_counter: 3 })),
  }));

vi.mock('../snapshot/cache.js', () => ({
  deleteSnapshotDomainCache: (host: string) => mockDeleteSnapshotDomainCache(host),
}));

vi.mock('../snapshot/snapshot-operator-metrics-shared.js', () => ({
  getSnapshotSharedMetricsForOperator: () => mockSnapshotSharedMetricsForOperator(),
}));

vi.mock('../snapshot/snapshot-metrics.js', () => ({
  getSnapshotMetricsSnapshot: () => mockSnapshotMetricsSnapshot(),
}));

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/snapshot/operator', snapshotOperatorRouter);

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
  process.env.SNAPSHOT_OPERATOR_TOKEN = 'snapshot-operator-secret';
  mockDeleteSnapshotDomainCache.mockClear();
  mockDeleteSnapshotDomainCache.mockResolvedValue(true);
  mockSnapshotSharedMetricsForOperator.mockClear();
  mockSnapshotSharedMetricsForOperator.mockResolvedValue({ shared_counter: 7 });
  mockSnapshotMetricsSnapshot.mockClear();
  mockSnapshotMetricsSnapshot.mockReturnValue({ in_memory_counter: 3 });
});

describe('Operator snapshot routes', () => {
  it('returns 404 for operator metrics without valid token', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot/operator/metrics`);
    expect(res.status).toBe(404);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('SNAPSHOT_RESOURCE_NOT_FOUND');
  });

  it('returns merged metrics with Bearer operator token', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot/operator/metrics`, {
      headers: {
        Authorization: `Bearer ${process.env.SNAPSHOT_OPERATOR_TOKEN}`,
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.in_memory_counter).toBe(3);
    expect(body.shared_counter).toBe(7);
  });

  it('returns merged metrics with operator header token', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot/operator/metrics`, {
      headers: {
        [SNAPSHOT_OPERATOR_TOKEN_HEADER]: String(process.env.SNAPSHOT_OPERATOR_TOKEN),
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.in_memory_counter).toBe(3);
    expect(body.shared_counter).toBe(7);
  });

  it('returns 400 for purge-cache when host is missing', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot/operator/purge-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SNAPSHOT_OPERATOR_TOKEN}`,
      },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('SNAPSHOT_HOST_REQUIRED');
  });

  it('purges cache for host with valid operator token', async () => {
    const res = await fetch(`${baseUrl}/api/snapshot/operator/purge-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.SNAPSHOT_OPERATOR_TOKEN}`,
      },
      body: JSON.stringify({ host: 'example.com' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(mockDeleteSnapshotDomainCache).toHaveBeenCalledWith('example.com');
  });
});
