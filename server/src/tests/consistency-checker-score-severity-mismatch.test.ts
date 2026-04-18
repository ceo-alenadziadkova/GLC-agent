import { describe, expect, it, vi } from 'vitest';

let mockDomains: Array<{
  domain_key: string;
  status: string;
  score: number;
  issues: Array<{ severity: string; confidence: string; title: string }>;
  confidence_distribution: null | { high: number; medium: number; low: number };
  unknown_items: string[];
  phase_number: number;
}> = [];

vi.mock('../services/supabase.js', () => {
  return {
    supabase: {
      from: (table: string) => {
        if (table === 'audit_domains') {
          const chain = {
            select: () => chain,
            eq: () => chain,
            in: () =>
              Promise.resolve({
                data: mockDomains,
                error: null,
              }),
          };
          return chain;
        }

        if (table === 'pipeline_events') {
          return {
            insert: async () => ({ error: null }),
          };
        }

        throw new Error(`Unexpected supabase table mock: ${table}`);
      },
    },
  };
});

vi.mock('../services/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { consistencyChecker } from '../services/consistency-checker.js';

describe('ConsistencyChecker score_severity_mismatch', () => {
  it('emits warning when score >= scoreSeverityMismatchCriticalMinScore and there is a critical issue', async () => {
    mockDomains = [
      {
        domain_key: 'tech_infrastructure',
        status: 'ok',
        score: 4,
        issues: [{ severity: 'critical', confidence: 'low', title: 'Critical issue' }],
        confidence_distribution: null,
        unknown_items: [],
        phase_number: 1,
      },
    ];

    const report = await consistencyChecker.run('audit-001', 4, [1]);
    expect(report.passed).toBe(false);
    const warning = report.flags.find((f) => f.rule === 'score_severity_mismatch');
    expect(warning).toBeDefined();
    expect(warning!.severity).toBe('warning');
  });

  it('emits info when score <= scoreSeverityMismatchLowMaxScore and there are issues but none are critical/high', async () => {
    mockDomains = [
      {
        domain_key: 'security_compliance',
        status: 'ok',
        score: 2,
        issues: [{ severity: 'low', confidence: 'medium', title: 'Low severity issue' }],
        confidence_distribution: null,
        unknown_items: [],
        phase_number: 1,
      },
    ];

    const report = await consistencyChecker.run('audit-002', 4, [1]);
    expect(report.passed).toBe(true);
    const info = report.flags.find((f) => f.rule === 'score_severity_mismatch');
    expect(info).toBeDefined();
    expect(info!.severity).toBe('info');
  });
});

