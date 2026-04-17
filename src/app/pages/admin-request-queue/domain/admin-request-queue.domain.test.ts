import { describe, expect, it } from 'vitest';
import type { AuditRequest } from '../../../data/auditTypes';
import {
  auditRequestAwaitingAdminAction,
  auditRequestPaginationMeta,
  buildAwaitingRows,
  type IntakeSubmissionQueueRow,
} from './admin-request-queue.domain';

const baseReq = (over: Partial<AuditRequest> & Pick<AuditRequest, 'id' | 'created_at'>): AuditRequest => ({
  id: over.id,
  client_id: 'cid',
  audit_id: null,
  url: 'https://example.com',
  industry: null,
  product_mode: 'express',
  status: 'submitted',
  brief_snapshot: {},
  client_notes: null,
  consultant_note: null,
  created_at: over.created_at,
  updated_at: over.created_at,
  ...over,
});

const baseIntake = (
  over: Partial<IntakeSubmissionQueueRow> & Pick<IntakeSubmissionQueueRow, 'token' | 'submitted_at'>,
): IntakeSubmissionQueueRow => ({
  metadata: {},
  responses: {},
  expires_at: new Date().toISOString(),
  audit_id: null,
  intake_url: 'https://example.com/i',
  ...over,
});

describe('auditRequestAwaitingAdminAction', () => {
  it('is true for submitted and under_review', () => {
    expect(auditRequestAwaitingAdminAction('submitted')).toBe(true);
    expect(auditRequestAwaitingAdminAction('under_review')).toBe(true);
  });
  it('is false for terminal states', () => {
    expect(auditRequestAwaitingAdminAction('approved')).toBe(false);
    expect(auditRequestAwaitingAdminAction('rejected')).toBe(false);
    expect(auditRequestAwaitingAdminAction('draft')).toBe(false);
  });
});

describe('buildAwaitingRows', () => {
  it('sorts newest first across requests and intake', () => {
    const rows = buildAwaitingRows(
      [baseReq({ id: 'a', created_at: '2020-01-02T00:00:00Z' })],
      [baseIntake({ token: 't1', submitted_at: '2020-01-03T00:00:00Z' })],
    );
    expect(rows.map(r => (r.kind === 'request' ? r.req.id : r.s.token))).toEqual(['t1', 'a']);
  });
});

describe('auditRequestPaginationMeta', () => {
  it('hides pagination for pending filter', () => {
    expect(
      auditRequestPaginationMeta({
        filter: 'pending',
        total: 100,
        limit: 50,
        pageOffset: 0,
        currentPageRowsCount: 50,
      }).showPagination,
    ).toBe(false);
  });
  it('shows when all tab and total exceeds limit', () => {
    expect(
      auditRequestPaginationMeta({
        filter: 'all',
        total: 100,
        limit: 50,
        pageOffset: 0,
        currentPageRowsCount: 50,
      }).showPagination,
    ).toBe(true);
  });
  it('computes range for partial last page', () => {
    const m = auditRequestPaginationMeta({
      filter: 'all',
      total: 55,
      limit: 50,
      pageOffset: 50,
      currentPageRowsCount: 5,
    });
    expect(m.rangeFrom).toBe(51);
    expect(m.rangeTo).toBe(55);
  });
});
