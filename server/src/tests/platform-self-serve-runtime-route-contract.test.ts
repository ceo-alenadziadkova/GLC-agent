import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

type PlatformSettingsWriteOk = { ok: true };
type PlatformSettingsWriteErr = { ok: false; error: string; statusCode: number };
type PlatformSettingsWriteResult = PlatformSettingsWriteOk | PlatformSettingsWriteErr;

const mocks = vi.hoisted(() => {
  const canManagePlatformSettings = vi.fn(async (_userId: string) => true);
  const getStoredSelfServeAuditOwnerUserId = vi.fn(async () => 'consultant-001');
  const resolveSelfServeAuditOwnerUserId = vi.fn(async () => ({ ok: true as const, userId: 'consultant-001' }));
  const listConsultantDirectoryRows = vi.fn(async () => [{ id: 'consultant-001' }]);
  const setStoredSelfServeAuditOwnerUserId = vi.fn(
    async (): Promise<PlatformSettingsWriteResult> => ({ ok: true }),
  );
  const getPlatformRuntimePolicySnapshot = vi.fn(async () => ({
    intake_token_ttl_days: 14,
    evaluation_retention_default_days: 30,
    evaluation_retention_extended_days: 90,
    evaluation_retention_internal_only_days: 365,
  }));
  const setPlatformRuntimePolicyPatch = vi.fn(
    async (): Promise<PlatformSettingsWriteResult> => ({ ok: true }),
  );

  let profileLookup:
    | { data: { id: string; role: string }; error: null }
    | { data: null; error: { message: string } } = { data: { id: 'consultant-001', role: 'consultant' }, error: null };

  const setProfileLookup = (
    next:
      | { data: { id: string; role: string }; error: null }
      | { data: null; error: { message: string } },
  ) => {
    profileLookup = next;
  };

  const mockFrom = vi.fn((table: string) => {
    if (table !== 'profiles') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => profileLookup),
        })),
      })),
    };
  });

  return {
    canManagePlatformSettings,
    getStoredSelfServeAuditOwnerUserId,
    resolveSelfServeAuditOwnerUserId,
    listConsultantDirectoryRows,
    setStoredSelfServeAuditOwnerUserId,
    getPlatformRuntimePolicySnapshot,
    setPlatformRuntimePolicyPatch,
    setProfileLookup,
    mockFrom,
  };
});

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userId = 'user-001';
    next();
  },
  attachProfile: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/rate-limit.js', () => ({
  generalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../services/supabase.js', () => ({
  supabase: { from: mocks.mockFrom },
}));

vi.mock('../lib/platform-admin.js', () => ({
  canManagePlatformSettings: mocks.canManagePlatformSettings,
}));

vi.mock('../lib/platform-self-serve-settings.js', () => ({
  getStoredSelfServeAuditOwnerUserId: mocks.getStoredSelfServeAuditOwnerUserId,
  setStoredSelfServeAuditOwnerUserId: mocks.setStoredSelfServeAuditOwnerUserId,
}));

vi.mock('../lib/self-serve-audit-owner.js', () => ({
  resolveSelfServeAuditOwnerUserId: mocks.resolveSelfServeAuditOwnerUserId,
}));

vi.mock('../lib/platform-runtime-settings.js', () => ({
  getPlatformRuntimePolicySnapshot: mocks.getPlatformRuntimePolicySnapshot,
  setPlatformRuntimePolicyPatch: mocks.setPlatformRuntimePolicyPatch,
}));

vi.mock('../lib/consultant-directory.js', () => ({
  listConsultantDirectoryRows: mocks.listConsultantDirectoryRows,
}));

vi.mock('../services/benchmark-snapshot.js', () => ({
  computeAndStoreBenchmarkSnapshots: vi.fn(async () => ({ inserted: 0 })),
}));

vi.mock('../services/bandit.js', () => ({
  banditService: {
    recomputeArmPerformanceFromEvaluationDatasets: vi.fn(async () => ({
      phases_updated: 0,
      arms_upserted: 0,
      dataset_rows_seen: 0,
      dry_run: false,
    })),
  },
}));

import { platformRouter } from '../routes/platform.js';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/platform', platformRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.canManagePlatformSettings.mockResolvedValue(true);
  mocks.getStoredSelfServeAuditOwnerUserId.mockResolvedValue('consultant-001');
  mocks.resolveSelfServeAuditOwnerUserId.mockResolvedValue({ ok: true, userId: 'consultant-001' });
  mocks.listConsultantDirectoryRows.mockResolvedValue([{ id: 'consultant-001' }]);
  mocks.setStoredSelfServeAuditOwnerUserId.mockResolvedValue({ ok: true });
  mocks.getPlatformRuntimePolicySnapshot.mockResolvedValue({
    intake_token_ttl_days: 14,
    evaluation_retention_default_days: 30,
    evaluation_retention_extended_days: 90,
    evaluation_retention_internal_only_days: 365,
  });
  mocks.setPlatformRuntimePolicyPatch.mockResolvedValue({ ok: true });
  mocks.setProfileLookup({ data: { id: 'consultant-001', role: 'consultant' }, error: null });
});

describe('platform self-serve/runtime contract', () => {
  it('PATCH /self-serve-owner returns 403 with admin-only code when caller cannot manage settings', async () => {
    mocks.canManagePlatformSettings.mockResolvedValue(false);
    const res = await fetch(`${baseUrl}/api/platform/self-serve-owner`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ owner_user_id: 'consultant-001' }),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_ADMIN_ONLY');
  });

  it('PATCH /self-serve-owner returns 400 with owner-required code when field is missing', async () => {
    const res = await fetch(`${baseUrl}/api/platform/self-serve-owner`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_OWNER_REQUIRED');
  });

  it('PATCH /self-serve-owner returns 400 with uuid-invalid code for non-string owner', async () => {
    const res = await fetch(`${baseUrl}/api/platform/self-serve-owner`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ owner_user_id: 42 }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_OWNER_UUID_INVALID');
  });

  it('PATCH /self-serve-owner returns 400 with owner-not-consultant code when profile check fails', async () => {
    mocks.setProfileLookup({ data: null, error: { message: 'profile missing' } });
    const res = await fetch(`${baseUrl}/api/platform/self-serve-owner`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ owner_user_id: 'consultant-404' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_OWNER_NOT_CONSULTANT');
  });

  it('PATCH /self-serve-owner returns persist-failed code when storage update fails', async () => {
    mocks.setStoredSelfServeAuditOwnerUserId.mockResolvedValueOnce({
      ok: false,
      statusCode: 503,
      error: 'persist failed',
    });
    const res = await fetch(`${baseUrl}/api/platform/self-serve-owner`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ owner_user_id: null }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_SELF_SERVE_PERSIST_FAILED');
  });

  it('GET /runtime-policies returns 403 with admin-only code for non-admin', async () => {
    mocks.canManagePlatformSettings.mockResolvedValue(false);
    const res = await fetch(`${baseUrl}/api/platform/runtime-policies`);
    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_ADMIN_ONLY');
  });

  it('PATCH /runtime-policies returns 400 with payload-invalid code for non-object body', async () => {
    const res = await fetch(`${baseUrl}/api/platform/runtime-policies`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([]),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_PAYLOAD_INVALID');
  });

  it('PATCH /runtime-policies returns 400 with payload-invalid code for empty patch', async () => {
    const res = await fetch(`${baseUrl}/api/platform/runtime-policies`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_PAYLOAD_INVALID');
  });

  it('PATCH /runtime-policies returns 400 with payload-invalid code for non-integer field', async () => {
    const res = await fetch(`${baseUrl}/api/platform/runtime-policies`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intake_token_ttl_days: 0 }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_PAYLOAD_INVALID');
  });

  it('PATCH /runtime-policies returns persist-failed code when update cannot be stored', async () => {
    mocks.setPlatformRuntimePolicyPatch.mockResolvedValueOnce({
      ok: false,
      statusCode: 503,
      error: 'persist failed',
    });
    const res = await fetch(`${baseUrl}/api/platform/runtime-policies`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intake_token_ttl_days: 21 }),
    });
    expect(res.status).toBe(503);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_SELF_SERVE_PERSIST_FAILED');
  });

  it('PATCH /runtime-policies returns update-failed code on unexpected exception', async () => {
    mocks.setPlatformRuntimePolicyPatch.mockRejectedValueOnce(new Error('boom'));
    const res = await fetch(`${baseUrl}/api/platform/runtime-policies`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intake_token_ttl_days: 21 }),
    });
    expect(res.status).toBe(500);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('PLATFORM_SELF_SERVE_UPDATE_FAILED');
  });
});
