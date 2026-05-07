import { describe, expect, it, vi } from 'vitest';

let mockDomains: Array<{
  domain_key: string;
  status: string;
  score: number;
  strengths?: string[];
  recommendations?: Array<{ impact?: string }>;
  issues: Array<{ severity: string; confidence: string; title: string; description?: string; status?: string; evidence_refs?: unknown[] }>;
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
        issues: [
          {
            severity: 'low',
            confidence: 'medium',
            title: 'Low severity issue',
            evidence_refs: [{ type: 'page_crawl', finding: 'minor issue observed' }],
          },
        ],
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

  it('flags ssl contradiction when strengths claim HTTPS and issue claims invalid SSL', async () => {
    mockDomains = [
      {
        domain_key: 'security_compliance',
        status: 'ok',
        score: 2,
        strengths: ['HTTPS properly implemented across all pages'],
        recommendations: [],
        issues: [
          {
            severity: 'high',
            confidence: 'medium',
            title: 'Invalid SSL certificate',
            description: 'Site has invalid SSL warning',
            evidence_refs: [{ type: 'ssl_check', finding: 'ssl.valid:false' }],
          },
        ],
        confidence_distribution: null,
        unknown_items: [],
        phase_number: 2,
      },
    ];

    const report = await consistencyChecker.run('audit-003', 4, [2]);
    const flag = report.flags.find((f) => f.rule === 'https_strength_vs_invalid_ssl');
    expect(flag).toBeDefined();
    expect(flag?.blocking).toBe(true);
  });

  it('flags GA4 vs GTM contradiction when GTM is claimed without strength evidence', async () => {
    mockDomains = [
      {
        domain_key: 'tech_infrastructure',
        status: 'ok',
        score: 3,
        strengths: ['Google Analytics 4 integration detected'],
        recommendations: [],
        issues: [
          {
            severity: 'medium',
            confidence: 'medium',
            title: 'Missing Google Tag Manager',
            description: 'No tag manager implementation detected',
            evidence_refs: [{ type: 'analytics_scan', finding: 'ga4=true gtm=false' }],
          },
        ],
        confidence_distribution: null,
        unknown_items: [],
        phase_number: 1,
      },
    ];

    const report = await consistencyChecker.run('audit-004', 4, [1]);
    const flag = report.flags.find((f) => f.rule === 'ga4_detected_vs_gtm_not_observed');
    expect(flag).toBeDefined();
    expect(flag?.blocking).toBe(true);
  });

  it('flags categorical wording on unverified findings as blocking', async () => {
    mockDomains = [
      {
        domain_key: 'ux_conversion',
        status: 'ok',
        score: 3,
        strengths: [],
        recommendations: [],
        issues: [
          {
            severity: 'medium',
            confidence: 'low',
            title: 'No viewport meta tag detected',
            description: 'No viewport meta tag was found in scan',
            status: 'unverified',
            evidence_refs: [{ type: 'ux_signals', finding: 'viewport check fallback' }],
          },
        ],
        confidence_distribution: null,
        unknown_items: [],
        phase_number: 4,
      },
    ];
    const report = await consistencyChecker.run('audit-005', 4, [4]);
    const flag = report.flags.find((f) => f.rule === 'categorical_claim_without_confirmation');
    expect(flag).toBeDefined();
    expect(flag?.blocking).toBe(true);
    expect(report.passed).toBe(false);
  });
});

