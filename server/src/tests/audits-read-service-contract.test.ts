import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  fetchAuditByIdForUserMock,
  fetchAuditRelatedReadModelMock,
  healUxDomainRowForFreeSnapshotPortalMock,
} = vi.hoisted(() => ({
  fetchAuditByIdForUserMock: vi.fn(),
  fetchAuditRelatedReadModelMock: vi.fn(),
  healUxDomainRowForFreeSnapshotPortalMock: vi.fn(),
}));

vi.mock('../repositories/audits/audit-read-model.repository.js', () => ({
  listAuditsByUser: vi.fn(),
  fetchAuditByIdForUser: fetchAuditByIdForUserMock,
  fetchAuditRelatedReadModel: fetchAuditRelatedReadModelMock,
}));

vi.mock('../lib/snapshot-audit-response-heal.js', () => ({
  healUxDomainRowForFreeSnapshotPortal: healUxDomainRowForFreeSnapshotPortalMock,
}));

import { getAuditViewModel } from '../services/audits/audits-read.service.js';

describe('getAuditViewModel contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    healUxDomainRowForFreeSnapshotPortalMock.mockResolvedValue({});
  });

  it('includes report_coverage in audit response model', async () => {
    fetchAuditByIdForUserMock.mockResolvedValue({
      data: {
        id: 'audit-1',
        user_id: 'user-1',
        client_id: null,
        company_url: 'https://example.com',
        product_mode: 'full',
        status: 'completed',
        overall_score: 4,
        execution_plan: {
          selected_domains: ['tech_infrastructure', 'security_compliance'],
        },
      },
      error: null,
    });

    fetchAuditRelatedReadModelMock.mockResolvedValue([
      { status: 'fulfilled', value: { data: null } },
      {
        status: 'fulfilled',
        value: {
          data: [
            { domain_key: 'tech_infrastructure', status: 'completed', version: 2 },
            { domain_key: 'security_compliance', status: 'pending', version: 1 },
          ],
        },
      },
      { status: 'fulfilled', value: { data: null } },
      { status: 'fulfilled', value: { data: [] } },
      { status: 'fulfilled', value: { data: null } },
    ]);

    const model = await getAuditViewModel('audit-1', 'user-1', 'consultant');

    expect(model).not.toBeNull();
    expect(model?.report_coverage).toBeDefined();
    expect(model?.report_coverage.covered_domains).toEqual(['tech_infrastructure']);
    expect(model?.report_coverage.coverage_ratio).toBeCloseTo(1 / 6, 5);
  });

  it('redacts review point notes for client viewers', async () => {
    fetchAuditByIdForUserMock.mockResolvedValue({
      data: {
        id: 'audit-1',
        user_id: 'user-1',
        client_id: null,
        company_url: 'https://example.com',
        product_mode: 'full',
        status: 'review',
        overall_score: null,
        execution_plan: null,
      },
      error: null,
    });

    fetchAuditRelatedReadModelMock.mockResolvedValue([
      { status: 'fulfilled', value: { data: null } },
      { status: 'fulfilled', value: { data: [] } },
      { status: 'fulfilled', value: { data: null } },
      {
        status: 'fulfilled',
        value: {
          data: [
            {
              id: 'rp-1',
              audit_id: 'audit-1',
              after_phase: 0,
              status: 'approved',
              consultant_notes: 'internal',
              interview_notes: 'also internal',
            },
          ],
        },
      },
      { status: 'fulfilled', value: { data: null } },
    ]);

    const model = await getAuditViewModel('audit-1', 'user-1', 'client');
    expect(model).not.toBeNull();
    const rev = model?.reviews as Array<{ consultant_notes: string | null; interview_notes: string | null }>;
    expect(rev[0].consultant_notes).toBeNull();
    expect(rev[0].interview_notes).toBeNull();
  });
});
