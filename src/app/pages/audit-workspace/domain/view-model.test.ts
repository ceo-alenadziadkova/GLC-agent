import { describe, expect, it } from 'vitest';
import type { AuditState, DomainData, DomainKey } from '../../../data/auditTypes';
import { deriveCompanyName, deriveOverallScore, deriveWorkspaceViewModel } from './view-model';

function makeDomain(domainKey: DomainKey, score: number | null): DomainData {
  return {
    id: `${domainKey}-1`,
    audit_id: 'a1',
    domain_key: domainKey,
    phase_number: 1,
    status: 'completed',
    score,
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
    raw_data: {},
  };
}

function makeAuditState(): AuditState {
  return {
    meta: {
      id: 'a1',
      user_id: 'u1',
      client_id: 'c1',
      company_url: 'https://example.com',
      no_public_website: false,
      company_name: null,
      industry: null,
      status: 'running',
      current_phase: 3,
      overall_score: null,
      execution_plan: {
        coverage_package: 'pro',
        selected_domains: ['ux_conversion', 'seo_digital'],
        include_strategy: true,
        depth: 'standard',
        source: 'user_selected',
      },
      product_mode: 'full',
      token_budget: 1000,
      tokens_used: 350,
      snapshot_token: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
    recon: null,
    domains: {
      ux_conversion: makeDomain('ux_conversion', 4),
      seo_digital: makeDomain('seo_digital', 2),
    },
    strategy: null,
    reviews: [],
    brief: null,
  };
}

describe('audit workspace view-model', () => {
  it('derives company name from URL fallback', () => {
    const state = makeAuditState();
    expect(deriveCompanyName(state)).toBe('https://example.com');
  });

  it('derives average overall score from visible domains when backend score missing', () => {
    const state = makeAuditState();
    expect(deriveOverallScore(state, ['ux_conversion', 'seo_digital'])).toBe(3);
  });

  it('derives visible domains from execution plan and binds active domain data', () => {
    const state = makeAuditState();
    const vm = deriveWorkspaceViewModel(state, 'ux_conversion');
    expect(vm.visibleDomainKeys).toEqual(['ux_conversion', 'seo_digital']);
    expect(vm.domainData?.domain_key).toBe('ux_conversion');
  });

  it('falls back to snapshot domain when selected domains are absent', () => {
    const state = makeAuditState();
    state.meta.execution_plan = null;
    state.meta.snapshot_token = 'snap_123';
    const vm = deriveWorkspaceViewModel(state, 'ux_conversion');
    expect(vm.visibleDomainKeys).toEqual(['ux_conversion']);
  });

  it('prefers selected domains over snapshot fallback when both are present', () => {
    const state = makeAuditState();
    state.meta.snapshot_token = 'snap_123';
    const vm = deriveWorkspaceViewModel(state, 'ux_conversion');
    expect(vm.visibleDomainKeys).toEqual(['ux_conversion', 'seo_digital']);
  });
});
