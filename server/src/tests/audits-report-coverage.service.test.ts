import { describe, expect, it } from 'vitest';
import { buildAuditReportCoverage } from '../services/audits/audits-report-coverage.service.js';

describe('buildAuditReportCoverage', () => {
  it('returns coverage dto from selected and completed domains', () => {
    const coverage = buildAuditReportCoverage(
      {
        overall_score: 4,
        execution_plan: {
          selected_domains: ['tech_infrastructure', 'security_compliance'],
        },
      },
      [
        { domain_key: 'tech_infrastructure', status: 'completed' },
        { domain_key: 'security_compliance', status: 'pending' },
      ],
    );

    expect(coverage.covered_domains).toEqual(['tech_infrastructure']);
    expect(coverage.coverage_ratio).toBeCloseTo(1 / 6, 5);
    expect(coverage.coverage_adjusted_score).toBeCloseTo(0.67, 2);
  });
});
