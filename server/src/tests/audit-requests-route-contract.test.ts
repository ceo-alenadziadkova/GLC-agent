import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import express from 'express';

const {
  setRole,
  getRole,
  setListShouldFail,
  getListShouldFail,
  setGetNotFound,
  getGetNotFound,
} = vi.hoisted(() => {
  let role: 'consultant' | 'guest' = 'consultant';
  let listShouldFail = false;
  let getNotFound = false;

  return {
    setRole: (next: 'consultant' | 'guest') => {
      role = next;
    },
    getRole: () => role,
    setListShouldFail: (next: boolean) => {
      listShouldFail = next;
    },
    getListShouldFail: () => listShouldFail,
    setGetNotFound: (next: boolean) => {
      getNotFound = next;
    },
    getGetNotFound: () => getNotFound,
  };
});

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userId = 'user-001';
    req.userEmail = 'user@example.com';
    req.userRole = getRole();
    next();
  },
  attachProfile: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../middleware/rate-limit.js', () => ({
  createAuditLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
  generalLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../audit-requests/services/audit-request-query.service.js', async () => {
  const { AuditRequestHttpError } = await import('../audit-requests/mappers/audit-request-error.mapper.js');
  return {
    listAuditRequestsForActor: vi.fn(async ({ limit, offset }: { limit: number; offset: number }) => {
      if (getListShouldFail()) {
        throw new Error('list exploded');
      }
      return { data: [], total: 0, limit, offset };
    }),
    getAuditRequestForActor: vi.fn(async () => {
      if (getGetNotFound()) {
        throw new AuditRequestHttpError(404, 'AUDIT_REQUEST_NOT_FOUND', 'Audit request not found.');
      }
      return { id: '0194de53-4e80-7042-b90f-e0052ee24f8e', status: 'draft' };
    }),
  };
});

import { auditRequestsRouter } from '../routes/audit-requests.js';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/audit-requests', auditRequestsRouter);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => server?.close());

beforeEach(() => {
  vi.clearAllMocks();
  setRole('consultant');
  setListShouldFail(false);
  setGetNotFound(false);
});

describe('audit-requests route contract', () => {
  it('returns AUDIT_REQUEST_GUEST_FORBIDDEN for guest access', async () => {
    setRole('guest');
    const response = await fetch(`${baseUrl}/api/audit-requests`);
    expect(response.status).toBe(403);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.code).toBe('AUDIT_REQUEST_GUEST_FORBIDDEN');
  });

  it('returns AUDIT_REQUEST_LIST_FAILED on list failure', async () => {
    setListShouldFail(true);
    const response = await fetch(`${baseUrl}/api/audit-requests?limit=20&offset=0`);
    expect(response.status).toBe(500);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.code).toBe('AUDIT_REQUEST_LIST_FAILED');
  });

  it('returns AUDIT_REQUEST_NOT_FOUND when request is missing', async () => {
    setGetNotFound(true);
    const response = await fetch(`${baseUrl}/api/audit-requests/0194de53-4e80-7042-b90f-e0052ee24f8e`);
    expect(response.status).toBe(404);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.code).toBe('AUDIT_REQUEST_NOT_FOUND');
  });
});
