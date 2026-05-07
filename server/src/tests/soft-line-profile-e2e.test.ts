import { describe, expect, it, vi } from 'vitest';

import { FactChecker } from '../services/fact-checker.js';
import type { DomainResult } from '../types/audit.js';

let mockDomains: Array<{
  domain_key: string;
  status: string;
  score: number;
  strengths: string[];
  recommendations: Array<{ impact?: string }>;
  issues: Array<{
    severity: string;
    confidence: string;
    title: string;
    description?: string;
    status?: string;
    evidence_refs?: unknown[];
  }>;
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
          return { insert: async () => ({ error: null }) };
        }
        throw new Error(`Unexpected supabase table mock: ${table}`);
      },
    },
  };
});

vi.mock('../services/logger.js', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { consistencyChecker } from '../services/consistency-checker.js';

function baseSoftLineResult(): DomainResult {
  return {
    score: 2,
    label: 'Needs Work',
    summary: 'Soft Line profile synthetic fixture for anti-hallucination integration coverage.',
    strengths: ['HTTPS properly implemented across all pages'],
    weaknesses: [],
    issues: [
      {
        id: 'ssl-1',
        severity: 'high',
        title: 'Invalid SSL Certificate',
        description: 'Website has invalid SSL warnings for visitors.',
        impact: 'Trust damage',
        confidence: 'low',
        evidence_refs: [{ type: 'ssl_check', finding: 'legacy scanner invalid ssl signal' }],
        data_source: 'inferred',
      },
      {
        id: 'vp-1',
        severity: 'high',
        title: 'No viewport meta tag detected',
        description: 'No viewport meta tag was found',
        impact: 'Poor mobile UX',
        confidence: 'low',
        evidence_refs: [{ type: 'ux_signals', finding: 'static crawl fallback only' }],
        data_source: 'inferred',
      },
    ],
    quick_wins: [],
    recommendations: [
      {
        id: 'rec-1',
        title: 'Redesign conversion flow',
        description: 'Prioritize pathways for product discovery.',
        priority: 'high',
        estimated_cost: '€3,000',
        estimated_time: '4 weeks',
        impact: 'Could increase lead generation by 200-400%',
      },
    ],
    unknown_items: ['UX signals collector unavailable'],
  };
}

describe('Soft Line profile e2e guardrails', () => {
  it('de-escalates disputed findings and blocks publication contradictions', async () => {
    const checker = new FactChecker();
    const verified = checker.verify(baseSoftLineResult(), 'security_compliance', {
      security_headers: {
        ssl: { valid: true, verification_status: 'confirmed' },
      },
      ux_signals: {
        viewport_meta_present: true,
        viewport_assessment_status: 'confirmed',
      },
    });

    const sslIssue = verified.result.issues.find((i) => i.id === 'ssl-1');
    const viewportIssue = verified.result.issues.find((i) => i.id === 'vp-1');
    expect(sslIssue?.status).toBe('unverified');
    expect(sslIssue?.severity).toBe('medium');
    expect(viewportIssue?.status).toBe('unverified');
    expect(viewportIssue?.severity).toBe('medium');
    expect(verified.result.recommendations[0]?.impact).not.toContain('%');

    mockDomains = [
      {
        domain_key: 'security_compliance',
        status: 'ok',
        score: verified.result.score,
        strengths: verified.result.strengths,
        recommendations: verified.result.recommendations.map((r) => ({ impact: r.impact })),
        issues: verified.result.issues.map((i) => ({
          severity: i.severity,
          confidence: i.confidence,
          title: i.title,
          description: i.description,
          status: i.status,
          evidence_refs: i.evidence_refs,
        })),
        confidence_distribution: { high: 0, medium: 0, low: 2 },
        unknown_items: verified.result.unknown_items,
        phase_number: 2,
      },
    ];

    const report = await consistencyChecker.run('audit-soft-line', 4, [2]);
    expect(report.passed).toBe(false);
    expect(report.flags.some((f) => f.rule === 'https_strength_vs_invalid_ssl' && f.blocking === true)).toBe(true);
    expect(report.flags.some((f) => f.rule === 'categorical_claim_without_confirmation' && f.blocking === true)).toBe(true);
  });
});

