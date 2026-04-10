import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const { setStoredFullName, setSelectShouldFail, setUpdateShouldFail } = vi.hoisted(() => {
  let storedFullName: string | null = 'Alice';
  let selectShouldFail = false;
  let updateShouldFail = false;

  (globalThis as Record<string, unknown>).__setProfileStoredFullName = (value: string | null) => {
    storedFullName = value;
  };
  (globalThis as Record<string, unknown>).__setProfileSelectShouldFail = (value: boolean) => {
    selectShouldFail = value;
  };
  (globalThis as Record<string, unknown>).__setProfileUpdateShouldFail = (value: boolean) => {
    updateShouldFail = value;
  };

  const mockFrom = vi.fn(() => ({
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
  }));

  (globalThis as Record<string, unknown>).__profileRouteSupabaseFrom = mockFrom;

  return {
    setStoredFullName: (value: string | null) => ((globalThis as Record<string, unknown>).__setProfileStoredFullName as (v: string | null) => void)(value),
    setSelectShouldFail: (value: boolean) =>
      ((globalThis as Record<string, unknown>).__setProfileSelectShouldFail as (v: boolean) => void)(value),
    setUpdateShouldFail: (value: boolean) =>
      ((globalThis as Record<string, unknown>).__setProfileUpdateShouldFail as (v: boolean) => void)(value),
  };
});

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: (globalThis as Record<string, unknown>).__profileRouteSupabaseFrom,
  },
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
    expect(body.error).toBe('Failed to update user profile');
  });
});
