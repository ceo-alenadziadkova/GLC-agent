import { describe, it, expect } from 'vitest';
import type { AuditMeta, AuditState, DomainData, ReconData } from '../data/auditTypes';
import { freeSnapshotPreviewFromAuditState } from './free-snapshot-preview-from-audit-state';

function meta(over: Partial<AuditMeta>): AuditMeta {
  return {
    id: 'audit-1',
    user_id: 'u1',
    client_id: null,
    company_url: 'https://example.com',
    company_name: 'Ex',
    industry: null,
    status: 'completed',
    current_phase: 4,
    overall_score: null,
    product_mode: 'free_snapshot',
    execution_plan: {
      selected_domains: ['ux_conversion'],
      depth: 'light',
      source: 'system_default',
      coverage_package: 'starter',
      include_strategy: false,
    },
    token_budget: 0,
    tokens_used: 0,
    snapshot_token: 'snap-tok',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    ...over,
  };
}

function emptyDomains(): AuditState['domains'] {
  const keys = [
    'tech_infrastructure',
    'security_compliance',
    'seo_digital',
    'ux_conversion',
    'marketing_utp',
    'automation_processes',
  ] as const;
  return Object.fromEntries(keys.map(k => [k, null])) as AuditState['domains'];
}

function uxDomain(raw: Record<string, unknown>): DomainData {
  return {
    id: 'd1',
    audit_id: 'audit-1',
    domain_key: 'ux_conversion',
    phase_number: 4,
    status: 'completed',
    score: null,
    label: null,
    version: 1,
    summary: null,
    strengths: [],
    weaknesses: [],
    issues: [],
    quick_wins: [],
    recommendations: [],
    unknown_items: [],
    confidence_distribution: null,
    raw_data: raw,
  };
}

describe('freeSnapshotPreviewFromAuditState', () => {
  it('returns null when audit is not snapshot-style starter', () => {
    const state: AuditState = {
      meta: meta({
        execution_plan: {
          selected_domains: ['tech_infrastructure', 'security_compliance'],
          depth: 'standard',
          source: 'system_default',
          coverage_package: 'pro',
          include_strategy: false,
        },
      }),
      recon: null,
      domains: emptyDomains(),
      strategy: null,
      reviews: [],
      brief: null,
    };
    expect(freeSnapshotPreviewFromAuditState(state)).toBeNull();
  });

  it('maps overall_score from snapshot_deterministic and legacy ux band', () => {
    const state: AuditState = {
      meta: meta({ status: 'completed' }),
      recon: { company_name: 'Co', tech_stack: {} } as ReconData,
      domains: {
        ...emptyDomains(),
        ux_conversion: uxDomain({
          snapshot_deterministic: {
            overall_score: 85,
            scan_basis: 'Test basis text',
            scan_basis_code: 'full',
            scan_coverage: {
              budget_ms: 8000,
              elapsed_ms: 500,
              pages_fetched: 2,
              max_pages_planned: 4,
              pages: [{ final_url: 'https://example.com/', status: 200, role: 'home' }],
            },
          },
        }),
      },
      strategy: null,
      reviews: [],
      brief: null,
    };
    const p = freeSnapshotPreviewFromAuditState(state);
    expect(p).not.toBeNull();
    expect(p!.overall_score).toBe(85);
    expect(p!.ux_score).toBe(5);
    expect(p!.ux_label).toBe('Good');
    expect(p!.ux_summary).toContain('Test basis');
    expect(p!.scan_coverage?.pages_fetched).toBe(2);
  });

  it('sets snapshot access flags when blocked in deterministic payload', () => {
    const state: AuditState = {
      meta: meta({}),
      recon: null,
      domains: {
        ...emptyDomains(),
        ux_conversion: uxDomain({
          snapshot_deterministic: {
            overall_score: 0,
            scan_basis_code: 'degraded',
            snapshot_access_blocked: true,
            snapshot_access_robots_blocked: true,
            scan_coverage: {
              budget_ms: 5000,
              elapsed_ms: 100,
              pages_fetched: 0,
              max_pages_planned: 2,
              pages: [],
            },
          },
        }),
      },
      strategy: null,
      reviews: [],
      brief: null,
    };
    const p = freeSnapshotPreviewFromAuditState(state);
    expect(p!.snapshot_access_blocked).toBe(true);
    expect(p!.snapshot_access_robots_blocked).toBe(true);
  });

  it('reflects running status from meta', () => {
    const state: AuditState = {
      meta: meta({ status: 'running' }),
      recon: null,
      domains: {
        ...emptyDomains(),
        ux_conversion: uxDomain({
          snapshot_deterministic: {
            overall_score: 50,
            scan_coverage: {
              budget_ms: 5000,
              elapsed_ms: 100,
              pages_fetched: 1,
              max_pages_planned: 2,
              pages: [{ final_url: 'https://x/', status: 200, role: 'home' }],
            },
          },
        }),
      },
      strategy: null,
      reviews: [],
      brief: null,
    };
    expect(freeSnapshotPreviewFromAuditState(state)!.status).toBe('running');
  });
});
