import { describe, expect, it } from 'vitest';
import { buildCoverage } from '../services/report-profiler/domain/coverage.js';
import { buildCsvActionPlan } from '../services/report-profiler/formatters/csv/csv-builder.js';
import { reportProfiler } from '../services/report-profiler.js';
import type { ReportInput } from '../services/report-profiler.js';

function createInput(): ReportInput {
  return {
    audit: {
      company_url: 'https://example.com',
      created_at: '2026-01-01T00:00:00.000Z',
      overall_score: 4,
      execution_plan: {
        selected_domains: ['tech_infrastructure', 'security_compliance'],
      },
    },
    recon: {
      company_name: 'Example Inc',
      industry: 'SaaS',
    },
    domains: [
      {
        domain_key: 'tech_infrastructure',
        score: 4,
        label: 'Good',
        summary: 'Strong baseline.',
        strengths: ['Stable infra'],
        weaknesses: [],
        issues: [
          {
            id: 'i1',
            severity: 'high',
            title: 'No CDN',
            description: 'Assets are served without edge cache.',
            impact: 'Slow global performance',
          },
        ],
        quick_wins: [
          {
            id: 'q1',
            title: 'Enable CDN',
            description: 'Turn on CDN for static files',
            effort: 'low',
            timeframe: '1 day',
          },
        ],
        recommendations: [
          {
            id: 'r1',
            title: 'Introduce cache headers',
            description: 'Add immutable caching for build assets',
            priority: 'high',
            estimated_cost: '$0',
            estimated_time: '2h',
            impact: 'Faster repeat loads',
          },
        ],
        status: 'completed',
        phase_number: 1,
      },
      {
        domain_key: 'security_compliance',
        score: null,
        label: null,
        summary: null,
        strengths: null,
        weaknesses: null,
        issues: null,
        quick_wins: null,
        recommendations: null,
        status: 'pending',
        phase_number: 2,
      },
    ],
    strategy: {
      executive_summary: 'Good baseline with clear quick wins.',
      quick_wins: [],
      medium_term: [],
      strategic: [],
    },
  };
}

describe('report-profiler refactor compatibility', () => {
  it('buildCoverage computes covered and adjusted score', () => {
    const coverage = buildCoverage(createInput());
    expect(coverage.covered_domains).toEqual(['tech_infrastructure']);
    expect(coverage.not_covered_domains.length).toBeGreaterThan(0);
    expect(coverage.coverage_adjusted_score).toBeCloseTo(0.67, 2);
  });

  it('buildCsvActionPlan keeps csv escaping and row generation', () => {
    const csv = buildCsvActionPlan(createInput());
    expect(csv).toContain('Title,Domain,Type,Priority');
    expect(csv).toContain('No CDN');
    expect(csv).toContain('Introduce cache headers');
  });

  it('reportProfiler.generate preserves profile output contract', () => {
    const report = reportProfiler.generate(createInput(), 'owner');
    expect(report.profile).toBe('owner');
    expect(report.profile_label).toBeTruthy();
    expect(report.company).toBe('Example Inc');
    expect(report.markdown).toContain('Business Audit Summary');
  });
});
