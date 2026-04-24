import { LEGAL_DOCUMENT_BUNDLE_VERSION } from '@glc/api-paths';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const {
  setStoredFullName,
  setSelectShouldFail,
  setUpdateShouldFail,
  setLegalConsentListRows,
  setLegalConsentInsertShouldFail,
} = vi.hoisted(() => {
  let storedFullName: string | null = 'Alice';
  let selectShouldFail = false;
  let updateShouldFail = false;
  let legalConsentListRows: Array<Record<string, unknown>> = [];
  let legalConsentInsertShouldFail = false;

  (globalThis as Record<string, unknown>).__setProfileStoredFullName = (value: string | null) => {
    storedFullName = value;
  };
  (globalThis as Record<string, unknown>).__setProfileSelectShouldFail = (value: boolean) => {
    selectShouldFail = value;
  };
  (globalThis as Record<string, unknown>).__setProfileUpdateShouldFail = (value: boolean) => {
    updateShouldFail = value;
  };
  (globalThis as Record<string, unknown>).__setLegalConsentListRows = (rows: Array<Record<string, unknown>>) => {
    legalConsentListRows = rows;
  };
  (globalThis as Record<string, unknown>).__setLegalConsentInsertShouldFail = (value: boolean) => {
    legalConsentInsertShouldFail = value;
  };

  const mockFrom = vi.fn((table: string) => {
    if (table === 'legal_consent_events') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: legalConsentListRows[0] ?? null,
                    error: null,
                  })),
                })),
              })),
            })),
            order: vi.fn(async () => ({ data: legalConsentListRows, error: null })),
          })),
        })),
        insert: vi.fn(async () =>
          legalConsentInsertShouldFail ? { error: { message: 'insert failed' } } : { error: null },
        ),
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () =>
            selectShouldFail
              ? { data: null, error: { message: 'select failed' } }
              : { data: { full_name: storedFullName }, error: null },
          ),
        })),
      })),
      update: vi.fn((payload: { full_name: string | null }) => ({
        eq: vi.fn(async () => {
          if (updateShouldFail) {
            return { error: { message: 'update failed' } };
          }
          storedFullName = payload.full_name;
          return { error: null };
        }),
      })),
    };
  });

  (globalThis as Record<string, unknown>).__profileRouteSupabaseFrom = mockFrom;

  return {
    setStoredFullName: (value: string | null) => ((globalThis as Record<string, unknown>).__setProfileStoredFullName as (v: string | null) => void)(value),
    setSelectShouldFail: (value: boolean) =>
      ((globalThis as Record<string, unknown>).__setProfileSelectShouldFail as (v: boolean) => void)(value),
    setUpdateShouldFail: (value: boolean) =>
      ((globalThis as Record<string, unknown>).__setProfileUpdateShouldFail as (v: boolean) => void)(value),
    setLegalConsentListRows: (rows: Array<Record<string, unknown>>) =>
      ((globalThis as Record<string, unknown>).__setLegalConsentListRows as (r: Array<Record<string, unknown>>) => void)(
        rows,
      ),
    setLegalConsentInsertShouldFail: (value: boolean) =>
      ((globalThis as Record<string, unknown>).__setLegalConsentInsertShouldFail as (v: boolean) => void)(value),
  };
});

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: (globalThis as Record<string, unknown>).__profileRouteSupabaseFrom as (t: string) => unknown,
  },
}));

vi.mock('../lib/platform-admin.js', () => ({
  canManagePlatformSettings: vi.fn(async () => false),
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, res: { status: (code: number) => { json: (body: unknown) => void } }, next: () => void) => {
    const header = req.headers && typeof req.headers === 'object'
      ? (req.headers as Record<string, string | undefined>).authorization
      : undefined;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }
    req.userId = 'user-001';
    req.userRole = 'consultant';
    req.userEmail = 'user@example.com';
    next();
  },
  attachProfile: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import { profileRouter } from '../routes/profile.js';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/profile', profileRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  vi.clearAllMocks();
  setStoredFullName('Alice');
  setSelectShouldFail(false);
  setUpdateShouldFail(false);
  setLegalConsentListRows([]);
  setLegalConsentInsertShouldFail(false);
});

describe('profile route', () => {
  it('GET /api/profile returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/profile`);
    expect(res.status).toBe(401);
  });

  it('GET /api/profile returns full_name', async () => {
    const res = await fetch(`${baseUrl}/api/profile`, {
      headers: { Authorization: 'Bearer token' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.full_name).toBe('Alice');
    expect(body.role).toBe('consultant');
  });

  it('GET /api/profile returns 500 when profile query fails', async () => {
    setSelectShouldFail(true);
    const res = await fetch(`${baseUrl}/api/profile`, {
      headers: { Authorization: 'Bearer token' },
    });
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('PROFILE_LOAD_FAILED');
    expect(body.error).toBe('Failed to load user profile');
  });

  it('PATCH /api/profile updates full_name', async () => {
    const res = await fetch(`${baseUrl}/api/profile`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ full_name: '  Bob  ' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.full_name).toBe('Bob');

    const getRes = await fetch(`${baseUrl}/api/profile`, {
      headers: { Authorization: 'Bearer token' },
    });
    const getBody = await getRes.json() as Record<string, unknown>;
    expect(getBody.full_name).toBe('Bob');
  });

  it('PATCH /api/profile returns 401 without token', async () => {
    const res = await fetch(`${baseUrl}/api/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: 'Bob' }),
    });
    expect(res.status).toBe(401);
  });

  it('PATCH /api/profile validates too long full_name', async () => {
    const res = await fetch(`${baseUrl}/api/profile`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ full_name: 'x'.repeat(201) }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('PROFILE_PAYLOAD_INVALID');
  });

  it('PATCH /api/profile normalizes whitespace-only full_name to null', async () => {
    const res = await fetch(`${baseUrl}/api/profile`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ full_name: '   ' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.full_name).toBeNull();
  });

  it('PATCH /api/profile rejects non-string full_name payload', async () => {
    const res = await fetch(`${baseUrl}/api/profile`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ full_name: 42 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('PROFILE_PAYLOAD_INVALID');
  });

  it('PATCH /api/profile returns 500 when profile update fails', async () => {
    setUpdateShouldFail(true);
    const res = await fetch(`${baseUrl}/api/profile`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ full_name: 'Bob' }),
    });
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('PROFILE_UPDATE_FAILED');
    expect(body.error).toBe('Failed to update user profile');
  });

  it('GET /api/profile/legal-consents returns published and effective', async () => {
    setLegalConsentListRows([
      {
        id: 'e1',
        user_id: 'user-001',
        consent_key: 'marketing',
        accepted: true,
        document_bundle_version: LEGAL_DOCUMENT_BUNDLE_VERSION,
        tos_version: '1.0.0',
        privacy_version: '1.0.0',
        dpa_version: '1.0.0',
        source: 'signup',
        created_at: '2026-04-01T00:00:00Z',
      },
    ]);
    const res = await fetch(`${baseUrl}/api/profile/legal-consents`, {
      headers: { Authorization: 'Bearer token' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { published: { bundle: string }; effective: unknown[] };
    expect(body.published.bundle).toBe(LEGAL_DOCUMENT_BUNDLE_VERSION);
    expect(body.effective).toHaveLength(1);
  });

  it('POST /api/profile/legal-consents rejects duplicate consent_key in one payload', async () => {
    const res = await fetch(`${baseUrl}/api/profile/legal-consents`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'settings',
        events: [
          { consent_key: 'marketing', accepted: true },
          { consent_key: 'marketing', accepted: false },
        ],
      }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('PROFILE_LEGAL_CONSENTS_PAYLOAD_INVALID');
  });

  it('POST /api/profile/legal-consents persists and returns effective', async () => {
    const res = await fetch(`${baseUrl}/api/profile/legal-consents`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'signup',
        events: [{ consent_key: 'tos_acceptance', accepted: true }],
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { effective: Array<{ consent_key: string }> };
    expect(Array.isArray(body.effective)).toBe(true);
  });

  it('POST /api/profile/legal-consents returns 500 when insert fails', async () => {
    setLegalConsentInsertShouldFail(true);
    const res = await fetch(`${baseUrl}/api/profile/legal-consents`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'settings',
        events: [{ consent_key: 'privacy_acknowledgment', accepted: true }],
      }),
    });
    expect(res.status).toBe(500);
    const body = await res.json() as Record<string, unknown>;
    expect(body.code).toBe('PROFILE_LEGAL_CONSENTS_SAVE_FAILED');
  });
});
