import { describe, expect, it, vi } from 'vitest';

import {
  buildClientProjectContextV1FromBriefRow,
  loadClientProjectContextForAuditId,
  normalizeClientProjectBankResponses,
} from '../services/client-project/client-project-context.service.js';
import { CLIENT_PROJECT_CONTEXT_VERSION } from '../types/audit/client-project-context.js';

vi.mock('../repositories/audits/audit-brief.repository.js', () => ({
  fetchBriefByAuditId: vi.fn(),
}));
vi.mock('../repositories/audits/collected-data-for-audit.repository.js', () => ({
  fetchCollectedDataRowsForAudit: vi.fn().mockResolvedValue({ rows: [], error: null }),
}));

import { fetchBriefByAuditId } from '../repositories/audits/audit-brief.repository.js';
import { fetchCollectedDataRowsForAudit } from '../repositories/audits/collected-data-for-audit.repository.js';

describe('client-project-context.service', () => {
  it('normalizeClientProjectBankResponses returns {} for non-objects', () => {
    expect(normalizeClientProjectBankResponses(null)).toEqual({});
    expect(normalizeClientProjectBankResponses([])).toEqual({});
    expect(normalizeClientProjectBankResponses('x')).toEqual({});
  });

  it('buildClientProjectContextV1FromBriefRow maps brief row to context', () => {
    const ctx = buildClientProjectContextV1FromBriefRow(
      {
        audit_id: 'audit-1',
        responses: { f1: { value: 'x', source: 'client' } },
        intake_versions: {
          questionBankVersion: '1',
          policyVersion: '1',
          layoutVersion: '1',
          resolverVersion: '1',
          sequencingVersion: '1',
        },
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        projectNarrative: {
          text: 'SaaS for teams',
          updatedAt: '2026-01-02T00:00:00.000Z',
          source: 'llm_snapshot',
        },
        auditEnrichment: { byKey: { lighthouse: { seo_score: 90 } } },
      },
    );
    expect(ctx.version).toBe(CLIENT_PROJECT_CONTEXT_VERSION);
    expect(ctx.auditId).toBe('audit-1');
    expect(ctx.bankResponses.f1).toEqual({ value: 'x', source: 'client' });
    expect(ctx.intakeVersionTuple).toMatchObject({ questionBankVersion: '1' });
    expect(ctx.projectNarrative?.text).toBe('SaaS for teams');
    expect(ctx.auditEnrichment.byKey?.lighthouse).toEqual({ seo_score: 90 });
    expect(ctx.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('loadClientProjectContextForAuditId returns null when no brief', async () => {
    vi.mocked(fetchBriefByAuditId).mockResolvedValueOnce(
      { data: null, error: { message: 'none' } } as Awaited<ReturnType<typeof fetchBriefByAuditId>>,
    );
    await expect(loadClientProjectContextForAuditId('missing')).resolves.toBeNull();
  });

  it('loadClientProjectContextForAuditId returns context from brief row', async () => {
    vi.mocked(fetchBriefByAuditId).mockResolvedValueOnce({
      data: {
        audit_id: 'a2',
        responses: {},
        updated_at: '2026-03-01T00:00:00.000Z',
      },
      error: null,
    } as Awaited<ReturnType<typeof fetchBriefByAuditId>>);
    const ctx = await loadClientProjectContextForAuditId('a2');
    expect(ctx?.auditId).toBe('a2');
    expect(ctx?.bankResponses).toEqual({});
  });

  it('loadClientProjectContextForAuditId merges Lighthouse from collected_data', async () => {
    vi.mocked(fetchBriefByAuditId).mockResolvedValueOnce({
      data: {
        audit_id: 'a3',
        responses: {},
        updated_at: '2026-03-01T00:00:00.000Z',
      },
      error: null,
    } as Awaited<ReturnType<typeof fetchBriefByAuditId>>);
    vi.mocked(fetchCollectedDataRowsForAudit).mockResolvedValueOnce({
      rows: [
        {
          collector_key: 'performance',
          data: { lighthouse: { performance_score: 50, requested_url: 'https://x.test' } },
        },
      ],
      error: null,
    });
    const ctx = await loadClientProjectContextForAuditId('a3');
    expect(ctx?.auditEnrichment.byKey?.performance_lighthouse).toMatchObject({
      performance_score: 50,
      requested_url: 'https://x.test',
    });
  });
});
