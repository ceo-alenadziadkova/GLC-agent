import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const { setAuthRole, setIdempotencyMode, setUpgradeThrows, isDpaAcceptanceEffectivelyTrue } = vi.hoisted(() => {
  let role = 'consultant';
  let idempotencyMode: 'ok' | 'conflict' | 'error' = 'ok';
  let upgradeThrows = false;
  const setAuthRole = (next: string) => { role = next; };
  const setIdempotencyMode = (next: 'ok' | 'conflict' | 'error') => { idempotencyMode = next; };
  const setUpgradeThrows = (next: boolean) => { upgradeThrows = next; };
  const isDpaAcceptanceEffectivelyTrue = vi.fn(async () => true);
  (globalThis as Record<string, unknown>).__auditsCreateRole = () => role;
  (globalThis as Record<string, unknown>).__auditsIdempotencyMode = () => idempotencyMode;
  (globalThis as Record<string, unknown>).__auditsUpgradeThrows = () => upgradeThrows;
  return { setAuthRole, setIdempotencyMode, setUpgradeThrows, isDpaAcceptanceEffectivelyTrue };
});

vi.mock('../services/supabase.js', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userId = 'user-001';
    req.userEmail = 'user@example.com';
    req.userRole = ((globalThis as Record<string, unknown>).__auditsCreateRole as () => string)();
    next();
  },
  attachProfile: (_req: unknown, _res: unknown, next: () => void) => next(),
  rejectGuestFromPortal: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  optionalAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/rate-limit.js', () => ({
  createAuditLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  generalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  pipelineLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../lib/idempotency.js', () => ({
  getStoredIdempotentResponse: vi.fn(async () => {
    const mode = ((globalThis as Record<string, unknown>).__auditsIdempotencyMode as () => 'ok' | 'conflict' | 'error')();
    if (mode === 'conflict') throw { name: 'IdempotencyPayloadConflictError' };
    if (mode === 'error') throw new Error('idempotency storage unavailable');
    return {
      replay: null,
      key: 'idem-key',
      hash: 'idem-hash',
    };
  }),
  isIdempotencyPayloadConflictError: vi.fn((err: unknown) => {
    const candidate = err as { name?: string };
    return candidate?.name === 'IdempotencyPayloadConflictError';
  }),
  storeIdempotentResponse: vi.fn(async () => undefined),
}));

vi.mock('../lib/upgrade-free-snapshot-audit.js', () => ({
  upgradeFreeSnapshotAudit: vi.fn(async () => {
    const shouldThrow = ((globalThis as Record<string, unknown>).__auditsUpgradeThrows as () => boolean)();
    if (shouldThrow) throw new Error('upgrade exploded');
    return { ok: true };
  }),
}));

vi.mock('../services/legal-consent.service.js', () => ({
  isDpaAcceptanceEffectivelyTrue,
}));

import { auditsRouter } from '../routes/audits.js';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/audits', auditsRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  vi.clearAllMocks();
  setAuthRole('consultant');
  setIdempotencyMode('ok');
  setUpgradeThrows(false);
  isDpaAcceptanceEffectivelyTrue.mockResolvedValue(true);
});

describe('audits create/upgrade contract errors', () => {
  it('POST /api/audits returns 403 with forbidden code for unsupported role', async () => {
    setAuthRole('guest');
    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });
    expect(res.status).toBe(403);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('AUDITS_FORBIDDEN');
  });

  it('POST /api/audits returns 403 with dpa-required when consultant has no DPA acceptance', async () => {
    isDpaAcceptanceEffectivelyTrue.mockResolvedValueOnce(false);
    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });
    expect(res.status).toBe(403);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('AUDITS_DPA_REQUIRED');
  });

  it('POST /api/audits returns 400 with company-url-required code when company_url is missing', async () => {
    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('AUDITS_COMPANY_URL_REQUIRED');
  });

  it('POST /api/audits returns 400 with company-url-invalid code for too-short normalized url', async () => {
    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'x' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('AUDITS_COMPANY_URL_INVALID');
  });

  it('POST /api/audits returns 400 with omit-url code when no_public_website=true and company_url provided', async () => {
    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        no_public_website: true,
        company_url: 'https://example.com',
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('AUDITS_OMIT_COMPANY_URL_WHEN_NO_PUBLIC_WEBSITE');
  });

  it('POST /api/audits/:id/upgrade-from-snapshot returns 400 with payload-invalid code', async () => {
    const res = await fetch(`${baseUrl}/api/audits/audit-001/upgrade-from-snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverage_package: 'invalid', use_scraped_context: true }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('AUDITS_UPGRADE_PAYLOAD_INVALID');
  });

  it('POST /api/audits returns 409 with idempotency mismatch code on idempotency conflict', async () => {
    setIdempotencyMode('conflict');
    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });
    expect(res.status).toBe(409);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('IDEMPOTENCY_PAYLOAD_MISMATCH');
  });

  it('POST /api/audits returns 500 with create-failed code on unexpected idempotency error', async () => {
    setIdempotencyMode('error');
    const res = await fetch(`${baseUrl}/api/audits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_url: 'https://example.com' }),
    });
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('AUDITS_CREATE_FAILED');
  });

  it('POST /api/audits/:id/upgrade-from-snapshot returns 500 with upgrade-failed code on exception', async () => {
    setUpgradeThrows(true);
    const res = await fetch(`${baseUrl}/api/audits/audit-001/upgrade-from-snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coverage_package: 'pro', use_scraped_context: true }),
    });
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('AUDITS_UPGRADE_FAILED');
  });
});
