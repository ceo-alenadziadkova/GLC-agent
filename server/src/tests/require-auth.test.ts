/**
 * Unit/integration tests: requireAuth, attachProfile, requireRole middleware
 *
 * Each middleware is mounted on a minimal Express app (random port) so tests
 * exercise real HTTP request/response cycles without a full application stack.
 *
 * Covers:
 *  requireAuth
 *    · 401 when Authorization header is missing entirely
 *    · 401 when header does not start with "Bearer "
 *    · 401 when Supabase rejects the token (invalid / expired)
 *    · 200 + req.userId set when token is valid
 *
 *  attachProfile
 *    · attaches role 'consultant' when email is in CONSULTANT_EMAILS
 *    · attaches role 'client' for any other email
 *    · 500 when Supabase profile upsert fails
 *
 *  requireRole
 *    · 403 when req.userRole doesn't match the required role
 *    · calls next() when role matches
 *
 * Uses native node fetch (Node 18+).
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, type Mock } from 'vitest';
import type { Server } from 'node:http';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const {
  mockGetUser,
  mockProfileSelect,
  mockProfileInsert,
  mockProfileUpdate,
  setGetUserResult,
  setProfileSelectResult,
  setProfileInsertResult,
  setProfileUpdateResult,
} = vi.hoisted(() => {
  let getUserResult: { data: { user: { id: string; email: string } | null }; error: Error | null } = {
    data: { user: { id: 'user-001', email: 'user@example.com' } },
    error: null,
  };
  let profileSelectResult: { data: { role: string } | null; error: { code?: string } | null } = {
    data: null,
    error: { code: 'PGRST116' },
  };
  let profileInsertResult: { data: { role: string } | null; error: Error | null } = {
    data: { role: 'client' },
    error: null,
  };
  let profileUpdateResult: { data: { role: string } | null; error: Error | null } = {
    data: { role: 'consultant' },
    error: null,
  };

  const setGetUserResult = (v: typeof getUserResult) => { getUserResult = v; };
  const setProfileSelectResult = (v: typeof profileSelectResult) => { profileSelectResult = v; };
  const setProfileInsertResult = (v: typeof profileInsertResult) => { profileInsertResult = v; };
  const setProfileUpdateResult = (v: typeof profileUpdateResult) => { profileUpdateResult = v; };

  const mockGetUser = vi.fn(() => Promise.resolve(getUserResult));

  const mockProfileSelect = vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve(profileSelectResult)),
    })),
  }));

  const mockProfileInsert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn(() => Promise.resolve(profileInsertResult)),
    })),
  }));

  const mockProfileUpdate = vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve(profileUpdateResult)),
      })),
    })),
  }));

  (globalThis as Record<string, unknown>).__authMockGetUser = mockGetUser;
  (globalThis as Record<string, unknown>).__authMockProfileSelect = mockProfileSelect;
  (globalThis as Record<string, unknown>).__authMockProfileInsert = mockProfileInsert;
  (globalThis as Record<string, unknown>).__authMockProfileUpdate = mockProfileUpdate;

  return {
    mockGetUser,
    mockProfileSelect,
    mockProfileInsert,
    mockProfileUpdate,
    setGetUserResult,
    setProfileSelectResult,
    setProfileInsertResult,
    setProfileUpdateResult,
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('../services/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: (globalThis as Record<string, unknown>).__authMockGetUser,
    },
    from: vi.fn(() => ({
      select: (globalThis as Record<string, unknown>).__authMockProfileSelect,
      insert: (globalThis as Record<string, unknown>).__authMockProfileInsert,
      update: (globalThis as Record<string, unknown>).__authMockProfileUpdate,
    })),
  },
}));

// ─── App setup ────────────────────────────────────────────────────────────────

import express, { type Request, type Response } from 'express';
import { requireAuth, attachProfile, requireRole } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

// Helper: build a minimal app with the given middleware chain + a 200 echo handler
function buildApp(middlewares: Array<(req: Request, res: Response, next: () => void) => unknown>) {
  const app = express();
  app.use(express.json());
  app.get('/test', ...(middlewares as Parameters<typeof app.get>[1][]), (req: Request, res: Response) => {
    res.json({ userId: (req as AuthRequest).userId, role: (req as AuthRequest).userRole });
  });
  return app;
}

let requireAuthServer: Server;
let requireAuthBase: string;
let fullChainServer: Server;
let fullChainBase: string;

function startServer(app: ReturnType<typeof express>): Promise<{ server: Server; base: string }> {
  return new Promise(resolve => {
    const srv = app.listen(0, () => {
      const addr = srv.address() as { port: number };
      resolve({ server: srv, base: `http://127.0.0.1:${addr.port}` });
    });
  });
}

beforeAll(async () => {
  const auth = await startServer(buildApp([requireAuth as never]));
  requireAuthServer = auth.server;
  requireAuthBase   = auth.base;

  const chain = await startServer(buildApp([requireAuth as never, attachProfile as never]));
  fullChainServer = chain.server;
  fullChainBase   = chain.base;
});

afterAll(async () => {
  await new Promise<void>(r => requireAuthServer.close(() => r()));
  await new Promise<void>(r => fullChainServer.close(() => r()));
});

beforeEach(() => {
  (mockGetUser as Mock).mockClear();
  (mockProfileSelect as Mock).mockClear();
  (mockProfileInsert as Mock).mockClear();
  (mockProfileUpdate as Mock).mockClear();
  // Reset to valid defaults
  setGetUserResult({ data: { user: { id: 'user-001', email: 'user@example.com' } }, error: null });
  setProfileSelectResult({ data: null, error: { code: 'PGRST116' } });
  setProfileInsertResult({ data: { role: 'client' }, error: null });
  setProfileUpdateResult({ data: { role: 'consultant' }, error: null });
});

// ─── requireAuth tests ────────────────────────────────────────────────────────

describe('requireAuth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const res = await fetch(`${requireAuthBase}/test`);
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Missing or invalid/i);
  });

  it('returns 401 when header does not start with "Bearer "', async () => {
    const res = await fetch(`${requireAuthBase}/test`, {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 when Supabase rejects the token', async () => {
    setGetUserResult({ data: { user: null }, error: new Error('invalid JWT') });
    const res = await fetch(`${requireAuthBase}/test`, {
      headers: { Authorization: 'Bearer bad-token' },
    });
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toMatch(/Invalid or expired/i);
  });

  it('returns 401 when getUser returns error with no user', async () => {
    setGetUserResult({ data: { user: null }, error: null });
    const res = await fetch(`${requireAuthBase}/test`, {
      headers: { Authorization: 'Bearer token-without-user' },
    });
    expect(res.status).toBe(401);
  });

  it('calls next and attaches userId for a valid token', async () => {
    setGetUserResult({ data: { user: { id: 'user-abc', email: 'abc@test.com' } }, error: null });
    const res = await fetch(`${requireAuthBase}/test`, {
      headers: { Authorization: 'Bearer valid-token' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { userId: string };
    expect(body.userId).toBe('user-abc');
  });

  it('strips "Bearer " prefix before passing token to Supabase', async () => {
    await fetch(`${requireAuthBase}/test`, {
      headers: { Authorization: 'Bearer my-jwt-token' },
    });
    expect(mockGetUser).toHaveBeenCalledWith('my-jwt-token');
  });
});

// ─── attachProfile tests ──────────────────────────────────────────────────────

describe('attachProfile', () => {
  it('assigns role "client" when email is not in CONSULTANT_EMAILS', async () => {
    process.env.CONSULTANT_EMAILS = 'boss@company.com';
    setGetUserResult({ data: { user: { id: 'user-001', email: 'random@other.com' } }, error: null });
    setProfileSelectResult({ data: null, error: { code: 'PGRST116' } });
    setProfileInsertResult({ data: { role: 'client' }, error: null });

    const res = await fetch(`${fullChainBase}/test`, {
      headers: { Authorization: 'Bearer tok' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { role: string };
    expect(body.role).toBe('client');
  });

  it('assigns role "consultant" when email matches CONSULTANT_EMAILS', async () => {
    process.env.CONSULTANT_EMAILS = 'consultant@glc.com,another@glc.com';
    setGetUserResult({ data: { user: { id: 'user-c', email: 'consultant@glc.com' } }, error: null });
    setProfileSelectResult({ data: null, error: { code: 'PGRST116' } });
    setProfileInsertResult({ data: { role: 'consultant' }, error: null });

    const res = await fetch(`${fullChainBase}/test`, {
      headers: { Authorization: 'Bearer tok' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { role: string };
    expect(body.role).toBe('consultant');
  });

  it('is case-insensitive for CONSULTANT_EMAILS match', async () => {
    process.env.CONSULTANT_EMAILS = 'BOSS@COMPANY.COM';
    setGetUserResult({ data: { user: { id: 'user-b', email: 'boss@company.com' } }, error: null });
    setProfileSelectResult({ data: null, error: { code: 'PGRST116' } });
    setProfileInsertResult({ data: { role: 'consultant' }, error: null });

    const res = await fetch(`${fullChainBase}/test`, {
      headers: { Authorization: 'Bearer tok' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { role: string };
    expect(body.role).toBe('consultant');
  });

  it('returns 500 when profile creation fails', async () => {
    setProfileSelectResult({ data: null, error: { code: 'PGRST116' } });
    setProfileInsertResult({ data: null, error: new Error('DB unavailable') });
    const res = await fetch(`${fullChainBase}/test`, {
      headers: { Authorization: 'Bearer tok' },
    });
    expect(res.status).toBe(500);
  });
});

// ─── requireRole tests ────────────────────────────────────────────────────────

describe('requireRole', () => {
  it('returns 403 when userRole does not match required role', async () => {
    // Build an app where user always has 'client' role but route requires 'consultant'
    const app = buildApp([
      (req, _res, next) => {
        (req as AuthRequest).userId   = 'user-001';
        (req as AuthRequest).userRole = 'client';
        next();
      },
      requireRole('consultant') as never,
    ]);
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}/test`);
      expect(res.status).toBe(403);
      const body = await res.json() as { error: string };
      expect(body.error).toMatch(/Access denied/i);
    } finally {
      await new Promise(r => server.close(r));
    }
  });

  it('calls next when userRole matches required role', async () => {
    const app = buildApp([
      (req, _res, next) => {
        (req as AuthRequest).userId   = 'user-c';
        (req as AuthRequest).userRole = 'consultant';
        next();
      },
      requireRole('consultant') as never,
    ]);
    const { server, base } = await startServer(app);
    try {
      const res = await fetch(`${base}/test`);
      expect(res.status).toBe(200);
    } finally {
      await new Promise(r => server.close(r));
    }
  });
});
