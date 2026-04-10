import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import type { Server } from 'node:http';

const state = vi.hoisted(() => {
  let sessionRow: Record<string, unknown> | null = null;
  let sessionsRows: Array<Record<string, unknown>> = [];
  let claimConflict = false;
  let linkConflict = false;
  let listShouldFail = false;
  let loadShouldFail = false;
  let auditsCreated = 0;
  let auditsDeleted = 0;
  let lastDiscoverySessionsOrFilter: string | null = null;

  return {
    setSessionRow: (row: Record<string, unknown> | null) => {
      sessionRow = row;
    },
    setSessionsRows: (rows: Array<Record<string, unknown>>) => {
      sessionsRows = rows;
    },
    setClaimConflict: (v: boolean) => {
      claimConflict = v;
    },
    setLinkConflict: (v: boolean) => {
      linkConflict = v;
    },
    setListShouldFail: (v: boolean) => {
      listShouldFail = v;
    },
    setLoadShouldFail: (v: boolean) => {
      loadShouldFail = v;
    },
    resetCounters: () => {
      auditsCreated = 0;
      auditsDeleted = 0;
      lastDiscoverySessionsOrFilter = null;
    },
    getCounters: () => ({ auditsCreated, auditsDeleted }),
    getSessionRow: () => sessionRow,
    getLastDiscoverySessionsOrFilter: () => lastDiscoverySessionsOrFilter,
    mockFrom: (table: string) => {
      if (table === 'discovery_sessions') {
        return {
          select: vi.fn(() => {
            const chain = {
              eq: vi.fn(() => ({
                single: vi.fn(async () =>
                  loadShouldFail
                    ? { data: null, error: { message: 'load failed' } }
                    : { data: sessionRow, error: sessionRow ? null : { code: 'PGRST116' } },
                ),
              })),
              or: vi.fn((filter: string) => {
                lastDiscoverySessionsOrFilter = filter;
                return chain;
              }),
              order: vi.fn(() => chain),
              limit: vi.fn(async () =>
                listShouldFail
                  ? { data: null, error: { message: 'list failed' } }
                  : { data: sessionsRows, error: null },
              ),
            };
            return chain;
          }),
          update: vi.fn((patch: Record<string, unknown>) => ({
            eq: vi.fn((firstEqColumn: string, firstEqValue: unknown) => {
              let current = sessionRow;
              const chain = {
                eq: vi.fn((column: string, value: unknown) => {
                  if (column === 'contact_edit_key_hash' && current && current[column] !== value) {
                    current = null;
                  }
                  return chain;
                }),
                is: vi.fn((column: string, value: unknown) => {
                  if (current && value === null && (current[column] ?? null) !== null) {
                    current = null;
                  }
                  return chain;
                }),
                select: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => {
                    // claim path: update({ consultant_id })
                    if ('consultant_id' in patch && !('audit_id' in patch)) {
                      if (claimConflict || !sessionRow) return { data: null, error: null };
                      sessionRow = { ...sessionRow, consultant_id: patch.consultant_id };
                      return { data: { id: sessionRow.id }, error: null };
                    }
                    // link path: update({ audit_id, consultant_id })
                    if ('audit_id' in patch) {
                      if (linkConflict || !sessionRow) return { data: null, error: null };
                      sessionRow = {
                        ...sessionRow,
                        consultant_id: patch.consultant_id,
                        audit_id: patch.audit_id,
                      };
                      return { data: { id: sessionRow.id }, error: null };
                    }
                    // contact patch path: update({ contact_* })
                    if (firstEqColumn === 'session_token') {
                      if (!current) return { data: null, error: null };
                      sessionRow = { ...current, ...patch };
                      return { data: { id: sessionRow.id }, error: null };
                    }
                    return { data: null, error: null };
                  }),
                })),
              };
              return chain;
            }),
          })),
        };
      }

      if (table === 'audits') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => {
                auditsCreated += 1;
                return { data: { id: 'audit-001' }, error: null };
              }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(async () => {
                auditsDeleted += 1;
                return { data: null, error: null };
              }),
            })),
          })),
        };
      }

      if (table === 'review_points' || table === 'audit_domains' || table === 'audit_recon' || table === 'audit_strategy') {
        return {
          insert: vi.fn(async () => ({ data: null, error: null })),
        };
      }

      return {
        insert: vi.fn(async () => ({ data: null, error: null })),
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      };
    },
    mockRpc: (_fn: string, args: Record<string, unknown>) => {
      const consultantId = args.p_consultant_id as string;
      if (!sessionRow) {
        return Promise.resolve({
          data: [{ audit_id: null, error_code: 'not_found', answers: null }],
          error: null,
        });
      }
      if (sessionRow.audit_id) {
        return Promise.resolve({
          data: [{ audit_id: sessionRow.audit_id, error_code: 'already_converted', answers: null }],
          error: null,
        });
      }
      if (sessionRow.consultant_id && sessionRow.consultant_id !== consultantId) {
        return Promise.resolve({
          data: [{ audit_id: null, error_code: 'forbidden_owner', answers: null }],
          error: null,
        });
      }
      if (claimConflict) {
        return Promise.resolve({
          data: [{ audit_id: null, error_code: 'claim_conflict', answers: null }],
          error: null,
        });
      }
      if (linkConflict) {
        return Promise.resolve({
          data: [{ audit_id: null, error_code: 'link_conflict', answers: null }],
          error: null,
        });
      }
      auditsCreated += 1;
      sessionRow = {
        ...sessionRow,
        consultant_id: consultantId,
        audit_id: 'audit-001',
      };
      return Promise.resolve({
        data: [{ audit_id: 'audit-001', error_code: null, answers: sessionRow.answers ?? {} }],
        error: null,
      });
    },
  };
});

vi.mock('../services/supabase.js', () => ({
  supabase: { from: state.mockFrom, rpc: state.mockRpc },
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: Record<string, unknown>, _res: unknown, next: () => void) => {
    req.userId = 'consultant-1';
    req.userRole = 'consultant';
    next();
  },
  attachProfile: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../services/brief-validator.js', () => ({
  saveBriefResponses: vi.fn(async () => ({ ok: true })),
}));

import { discoverRouter } from '../routes/discover.js';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/discover', discoverRouter);
  await new Promise<void>(resolve => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(() => server.close());

beforeEach(() => {
  state.resetCounters();
  state.setClaimConflict(false);
  state.setLinkConflict(false);
  state.setListShouldFail(false);
  state.setLoadShouldFail(false);
  state.setSessionsRows([
    {
      session_token: 'session-token-1',
      maturity_level: 3,
      findings: [],
      contact_name: 'Contact',
      contact_email: 'x@example.com',
      contact_phone: '+34',
      contact_company: 'Biz',
      audit_id: null,
      created_at: new Date().toISOString(),
      answers: { a1: 'Hotel Blue', a2: 'hospitality' },
      consultant_id: null,
    },
  ]);
  state.setSessionRow({
    id: 'session-1',
    answers: { a2: 'hospitality', a1: 'Hotel Blue' },
    maturity_level: 3,
    findings: [],
    contact_name: 'Hotel Blue',
    contact_company: null,
    contact_edit_key_hash: '0'.repeat(64),
    audit_id: null,
    consultant_id: null,
  });
});

describe('POST /api/discover/:token/convert', () => {
  it('returns 400 for invalid token format', async () => {
    const res = await fetch(`${baseUrl}/api/discover/not-a-valid-token/convert`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test' },
    });
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid token');
  });

  it('returns 403 when session is assigned to another consultant', async () => {
    state.setSessionRow({
      ...state.getSessionRow(),
      consultant_id: 'consultant-2',
    } as Record<string, unknown>);

    const res = await fetch(`${baseUrl}/api/discover/${'a'.repeat(40)}/convert`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test' },
    });
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(403);
    expect(body.error).toBe('Session is assigned to another consultant');
  });

  it('claims unassigned session and converts successfully', async () => {
    const res = await fetch(`${baseUrl}/api/discover/${'b'.repeat(40)}/convert`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test' },
    });
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(201);
    expect(body.audit_id).toBe('audit-001');
    expect((state.getSessionRow() as Record<string, unknown>).consultant_id).toBe('consultant-1');
    expect((state.getSessionRow() as Record<string, unknown>).audit_id).toBe('audit-001');
  });

  it('returns 409 on claim conflict', async () => {
    state.setClaimConflict(true);

    const res = await fetch(`${baseUrl}/api/discover/${'c'.repeat(40)}/convert`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test' },
    });
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(409);
    expect(body.error).toBe('Session was claimed or converted by another request');
  });

  it('returns 409 when RPC reports link conflict', async () => {
    state.setLinkConflict(true);

    const res = await fetch(`${baseUrl}/api/discover/${'d'.repeat(40)}/convert`, {
      method: 'POST',
      headers: { Authorization: 'Bearer test' },
    });
    const body = await res.json() as Record<string, unknown>;
    const counters = state.getCounters();

    expect(res.status).toBe(409);
    expect(body.error).toBe('Session conversion conflict. Please retry.');
    expect(counters.auditsCreated).toBe(0);
    expect(counters.auditsDeleted).toBe(0);
  });
});

describe('GET /api/discover/:token', () => {
  it('returns 400 for invalid token format', async () => {
    const res = await fetch(`${baseUrl}/api/discover/not-a-valid-token`);
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(body.error).toBe('Invalid token');
  });

  it('returns 404 when session load query fails', async () => {
    state.setLoadShouldFail(true);
    const res = await fetch(`${baseUrl}/api/discover/${'a'.repeat(40)}`);
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(404);
    expect(body.error).toBe('Session not found');
  });
});

describe('GET /api/discover/sessions', () => {
  it('applies consultant scoping filter and returns rows', async () => {
    const res = await fetch(`${baseUrl}/api/discover/sessions`, {
      headers: { Authorization: 'Bearer test' },
    });
    const body = await res.json() as Record<string, unknown>;

    expect(res.status).toBe(200);
    expect(state.getLastDiscoverySessionsOrFilter()).toBe('consultant_id.is.null,consultant_id.eq.consultant-1');
    expect(Array.isArray(body.sessions)).toBe(true);
    const first = (body.sessions as Array<Record<string, unknown>>)[0];
    expect(first.consultant_id).toBeNull();
    expect(first.industry).toBe('hospitality');
    expect(first.biz_description).toBe('Hotel Blue');
    expect(first.contact_email).toBeNull();
  });

  it('returns 500 when listing query fails', async () => {
    state.setListShouldFail(true);
    const res = await fetch(`${baseUrl}/api/discover/sessions`, {
      headers: { Authorization: 'Bearer test' },
    });
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to list sessions');
  });
});

describe('PATCH /api/discover/:token/contact', () => {
  it('requires a valid contact_edit_key', async () => {
    const res = await fetch(`${baseUrl}/api/discover/${'e'.repeat(40)}/contact`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_name: 'Alice' }),
    });
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(403);
    expect(body.error).toBe('Invalid or missing contact edit key');
  });

  it('returns 400 when all provided contact fields are empty', async () => {
    const res = await fetch(`${baseUrl}/api/discover/${'e'.repeat(40)}/contact`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_edit_key: 'f'.repeat(64),
        contact_name: '   ',
        contact_email: '',
      }),
    });
    const body = await res.json() as Record<string, unknown>;
    expect(res.status).toBe(400);
    expect(body.error).toBe('At least one contact field must be non-empty');
  });
});
