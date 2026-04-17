import { describe, expect, it } from 'vitest';
import type { AuditState } from '../../../data/auditTypes';
import { getReportPageViewModel } from './selectors';

function createAuditState(): AuditState {
  return {
    meta: {
      id: 'a1',
      user_id: 'u1',
      client_id: null,
      company_url: 'https://example.com',
      company_name: 'Example',
      industry: 'SaaS',
      status: 'completed',
      current_phase: 7,
      overall_score: 4,
      product_mode: 'full',
      execution_plan: {
        selected_domains: ['tech_infrastructure', 'security_compliance'],
        depth: 'standard',
        source: 'user_selected',
      },
      token_budget: 10000,
      tokens_used: 1000,
      snapshot_token: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    },
    report_coverage: {
      covered_domains: ['tech_infrastructure', 'security_compliance'],
      not_covered_domains: ['seo_digital', 'ux_conversion', 'marketing_utp', 'automation_processes'],
      coverage_ratio: 2 / 6,
      coverage_adjusted_score: 1.33,
      comparability_note:
        'Partial audit: do not compare this overall score directly with complete (6-domain) audits.',
    },
    recon: null,
    domains: {
      tech_infrastructure: {
        id: 'd1',
        audit_id: 'a1',
        domain_key: 'tech_infrastructure',
        phase_number: 1,
        status: 'completed',
        score: 4,
        label: 'Good',
        version: 1,
        summary: null,
        strengths: ['Strong hosting'],
        weaknesses: [],
        issues: [],
        quick_wins: [],
        recommendations: [],
        unknown_items: [],
        confidence_distribution: null,
        raw_data: {},
      },
      security_compliance: {
        id: 'd2',
        audit_id: 'a1',
        domain_key: 'security_compliance',
        phase_number: 2,
        status: 'completed',
        score: 3,
        label: 'Moderate',
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
      },
      seo_digital: null,
      ux_conversion: null,
      marketing_utp: null,
      automation_processes: null,
    },
    strategy: null,
    reviews: [],
    brief: null,
  };
}

describe('getReportPageViewModel', () => {
  it('calculates coverage and average score from visible domains', () => {
    const vm = getReportPageViewModel(createAuditState(), 'full');

    expect(vm.averageScore).toBe(3.5);
    expect(vm.coverage.coveredDomains).toEqual(['tech_infrastructure', 'security_compliance']);
    expect(vm.coverage.missingDomains.length).toBe(4);
    expect(vm.coverage.coverageAdjustedScore).toBeCloseTo(1.33, 2);
  });
});
