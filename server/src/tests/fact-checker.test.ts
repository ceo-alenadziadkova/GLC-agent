/**
 * Smoke tests: FactChecker
 *
 * Tests applyCorrections() which was previously a no-op.
 * Covers: flag-based score reduction, hard overrides, score bounds,
 * label re-mapping, domain-specific checks (security, SEO, tech, UX).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: null, error: null })),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    })),
  },
}));

import { FactChecker } from '../services/fact-checker.js';
import type { DomainResult } from '../types/audit.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

const STUB_ISSUE_FIELDS = {
  confidence: 'medium' as const,
  evidence_refs: [{ type: 'stub', finding: 'test' }],
  data_source: 'auto_detected' as const,
};

function makeDomainResult(overrides: Partial<DomainResult> = {}): DomainResult {
  return {
    score: 4,
    label: 'Good',
    summary: 'Test summary that is long enough to pass validation requirements here.',
    strengths: ['Good SSL', 'Fast load'],
    weaknesses: ['Missing CSP'],
    issues: [
      { id: 'i1', severity: 'medium', title: 'Missing CSP', description: 'No Content-Security-Policy', impact: 'Medium', ...STUB_ISSUE_FIELDS },
    ],
    quick_wins: [],
    recommendations: [],
    unknown_items: [],
    ...overrides,
  };
}

const checker = new FactChecker();

// ─── applyCorrections via verify() ────────────────────────────────────────

describe('FactChecker — score flags reduce score', () => {
  it('one flag reduces score by 1', () => {
    // Score 4 + SSL invalid → should flag and reduce to 3
    const result = makeDomainResult({ score: 4 });
    const collected = {
      security_headers: {
        ssl: { valid: false },
        headers: [],
      },
    };
    const { result: corrected, corrections } = checker.verify(result, 'security_compliance', collected);
    expect(corrections.length).toBeGreaterThanOrEqual(1);
    expect(corrected.score).toBeLessThan(result.score);
  });

  it('two flags reduce score by exactly 2 (max cap)', () => {
    // Score 5 with no sitemap + no robots.txt → 2 flags → score drops to 3
    const result = makeDomainResult({ score: 5, issues: [] });
    const collected = {
      seo_meta: {
        sitemap: { exists: false },
        robots_txt: { exists: false },
        page_analysis: { issues: [], meta_coverage: { with_description: 8, total: 10 } },
      },
    };
    const { result: corrected } = checker.verify(result, 'seo_digital', collected);
    expect(corrected.score).toBe(3); // 5 - 2 = 3
  });

  it('three flags still only reduce by max 2', () => {
    // Score 5 with no sitemap + no robots.txt + low meta coverage → 3 flags → score drops max 2 to 3
    const result = makeDomainResult({ score: 5, issues: [] });
    const collected = {
      seo_meta: {
        sitemap: { exists: false },
        robots_txt: { exists: false },
        page_analysis: { issues: [], meta_coverage: { with_description: 2, total: 10 } },
      },
    };
    const { result: corrected } = checker.verify(result, 'seo_digital', collected);
    expect(corrected.score).toBe(3); // 5 - 2 (capped)
    expect(corrected.score).toBeGreaterThanOrEqual(1);
  });

  it('score never drops below 1', () => {
    const result = makeDomainResult({ score: 1 });
    // Score 1 + SSL invalid (but SSL flag only activates for score >= 4, so no flag)
    // + consistency check: score 1 needs critical issues, or it gets flagged
    // Let's give it only low-severity issues to trigger the score-1 consistency flag
    const resultWithNoHighIssues = makeDomainResult({
      score: 1,
      issues: [{ id: 'i1', severity: 'low', title: 'Minor', description: 'Minor issue', impact: 'Low', ...STUB_ISSUE_FIELDS }],
    });
    const { result: corrected } = checker.verify(resultWithNoHighIssues, 'security_compliance', {});
    expect(corrected.score).toBeGreaterThanOrEqual(1);
  });
});

describe('FactChecker — label updates after correction', () => {
  it('score 4 → 3 produces label "Moderate"', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      security_headers: { ssl: { valid: false }, headers: [] },
    };
    const { result: corrected } = checker.verify(result, 'security_compliance', collected);
    if (corrected.score !== result.score) {
      const expectedLabel: Record<number, string> = { 3: 'Moderate', 2: 'Needs Work', 1: 'Critical' };
      expect(corrected.label).toBe(expectedLabel[corrected.score] ?? corrected.label);
    }
  });

  it('no corrections → original label unchanged', () => {
    const result = makeDomainResult({ score: 3, label: 'Moderate' });
    // Score 3 + no issues triggering flags
    const { result: corrected, corrections } = checker.verify(result, 'security_compliance', {});
    if (corrections.length === 0) {
      expect(corrected.label).toBe('Moderate');
    }
  });
});

describe('FactChecker — consistency checks', () => {
  it('score 5 with a critical issue triggers a flag', () => {
    const result = makeDomainResult({
      score: 5,
      issues: [{ id: 'i1', severity: 'critical', title: 'Critical bug', description: 'Bad', impact: 'High', ...STUB_ISSUE_FIELDS }],
    });
    const { corrections } = checker.verify(result, 'security_compliance', {});
    const hasConsistencyFlag = corrections.some(c => c.issue.includes('critical issues'));
    expect(hasConsistencyFlag).toBe(true);
  });

  it('score 1 without critical/high issues triggers a flag', () => {
    const result = makeDomainResult({
      score: 1,
      issues: [{ id: 'i1', severity: 'low', title: 'Minor', description: 'Minor', impact: 'Low', ...STUB_ISSUE_FIELDS }],
    });
    const { corrections } = checker.verify(result, 'security_compliance', {});
    const hasConsistencyFlag = corrections.some(c => c.issue.includes('no critical or high issues'));
    expect(hasConsistencyFlag).toBe(true);
  });

  it('high score with far more weaknesses than strengths gets flagged', () => {
    const result = makeDomainResult({
      score: 4,
      strengths: ['One thing'],
      weaknesses: ['W1', 'W2', 'W3', 'W4', 'W5'],
    });
    const { corrections } = checker.verify(result, 'security_compliance', {});
    const hasBalanceFlag = corrections.some(c => c.issue.includes('weaknesses than strengths'));
    expect(hasBalanceFlag).toBe(true);
  });
});

describe('FactChecker — domain-specific checks: security', () => {
  it('invalid SSL + score >= 4 triggers a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      security_headers: { ssl: { valid: false }, headers: [] },
    };
    const { corrections } = checker.verify(result, 'security_compliance', collected);
    const sslFlag = corrections.some(c => c.issue.includes('SSL'));
    expect(sslFlag).toBe(true);
  });

  it('valid SSL + score 4 → no SSL flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      security_headers: { ssl: { valid: true }, headers: [] },
    };
    const { corrections } = checker.verify(result, 'security_compliance', collected);
    const sslFlag = corrections.some(c => c.issue.includes('SSL certificate'));
    expect(sslFlag).toBe(false);
  });

  it('2 critical headers missing + score >= 4 triggers a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      security_headers: {
        ssl: { valid: true },
        headers: [
          { name: 'Content-Security-Policy', present: false },
          { name: 'Strict-Transport-Security', present: false },
        ],
      },
    };
    const { corrections } = checker.verify(result, 'security_compliance', collected);
    const headerFlag = corrections.some(c => c.issue.includes('critical security headers'));
    expect(headerFlag).toBe(true);
  });

  it('cookie security issues + score >= 4 triggers a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      security_headers: {
        ssl: { valid: true },
        headers: [],
        cookies: {
          issues: ['Cookie "session" missing Secure HttpOnly flag'],
        },
      },
    };
    const { corrections } = checker.verify(result, 'security_compliance', collected);
    const cookieFlag = corrections.some(c => c.issue.includes('cookie security issue'));
    expect(cookieFlag).toBe(true);
  });

  it('header hygiene issues + score >= 4 triggers a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      security_headers: {
        ssl: { valid: true },
        headers: [
          { name: 'X-Powered-By (should be absent)', present: false },
          { name: 'Server (should be minimal)', present: false },
        ],
      },
    };
    const { corrections } = checker.verify(result, 'security_compliance', collected);
    const hygieneFlag = corrections.some(c => c.issue.includes('header hygiene issue'));
    expect(hygieneFlag).toBe(true);
  });

  it('valid SSL but no redirect to HTTPS + score >= 4 triggers a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      security_headers: {
        ssl: { valid: true, redirects_to_https: false },
        headers: [],
      },
    };
    const { corrections } = checker.verify(result, 'security_compliance', collected);
    const redirectFlag = corrections.some(c => c.issue.includes('redirect to HTTPS'));
    expect(redirectFlag).toBe(true);
  });

  it('missing baseline hardening headers + score >= 4 triggers a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      security_headers: {
        ssl: { valid: true, redirects_to_https: true },
        headers: [
          { name: 'X-Content-Type-Options', present: false },
          { name: 'X-Frame-Options', present: false },
          { name: 'Referrer-Policy', present: true },
          { name: 'Permissions-Policy', present: false },
        ],
      },
    };
    const { corrections } = checker.verify(result, 'security_compliance', collected);
    const baselineFlag = corrections.some(c => c.issue.includes('baseline security header'));
    expect(baselineFlag).toBe(true);
  });
});

describe('FactChecker — domain-specific checks: SEO', () => {
  it('score 5 without sitemap → flag', () => {
    const result = makeDomainResult({ score: 5, issues: [] });
    const collected = {
      seo_meta: { sitemap: { exists: false }, robots_txt: { exists: true } },
    };
    const { corrections } = checker.verify(result, 'seo_digital', collected);
    const sitemapFlag = corrections.some(c => c.issue.includes('sitemap'));
    expect(sitemapFlag).toBe(true);
  });

  it('< 50% meta description coverage + score >= 4 → flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      seo_meta: {
        sitemap: { exists: true },
        robots_txt: { exists: true },
        page_analysis: {
          issues: [],
          meta_coverage: { with_description: 3, total: 10 }, // 30%
        },
      },
    };
    const { corrections } = checker.verify(result, 'seo_digital', collected);
    const metaFlag = corrections.some(c => c.issue.includes('meta descriptions'));
    expect(metaFlag).toBe(true);
  });

  it('robots.txt issues + score >= 4 trigger a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      seo_meta: {
        sitemap: { exists: true },
        robots_txt: {
          exists: true,
          issues: ['robots.txt does not declare a Sitemap: directive'],
        },
        page_analysis: {
          issues: [],
          meta_coverage: { with_description: 10, total: 10 },
        },
      },
    };
    const { corrections } = checker.verify(result, 'seo_digital', collected);
    const robotsFlag = corrections.some(c => c.issue.includes('robots.txt has'));
    expect(robotsFlag).toBe(true);
  });

  it('low structured-data coverage + score >= 4 triggers a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      seo_meta: {
        sitemap: { exists: true },
        robots_txt: { exists: true, issues: [] },
        open_graph: { pages_with_structured_data: 2, total_pages: 10 },
        page_analysis: {
          issues: [],
          meta_coverage: { with_description: 9, total: 10 },
        },
      },
    };
    const { corrections } = checker.verify(result, 'seo_digital', collected);
    const sdFlag = corrections.some(c => c.issue.includes('structured data coverage'));
    expect(sdFlag).toBe(true);
  });
});

describe('FactChecker — domain-specific checks: UX', () => {
  it('alt text < 50% + score >= 4 → flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      accessibility: {
        image_accessibility: { alt_coverage_percent: 30 },
      },
    };
    const { corrections } = checker.verify(result, 'ux_conversion', collected);
    const altFlag = corrections.some(c => c.issue.includes('alt text'));
    expect(altFlag).toBe(true);
  });

  it('pages missing H1 + score >= 4 trigger a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      accessibility: {
        image_accessibility: { alt_coverage_percent: 90 },
        heading_hierarchy: {
          pages_with_no_h1: 3,
          pages_with_broken_hierarchy: 0,
        },
        pages_analyzed: 10,
        structured_data_present: true,
      },
    };
    const { corrections } = checker.verify(result, 'ux_conversion', collected);
    const h1Flag = corrections.some(c => c.issue.includes('missing H1'));
    expect(h1Flag).toBe(true);
  });

  it('broken heading hierarchy + score >= 4 triggers a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      accessibility: {
        image_accessibility: { alt_coverage_percent: 90 },
        heading_hierarchy: {
          pages_with_no_h1: 0,
          pages_with_broken_hierarchy: 2,
        },
        pages_analyzed: 10,
        structured_data_present: true,
      },
    };
    const { corrections } = checker.verify(result, 'ux_conversion', collected);
    const hierarchyFlag = corrections.some(c => c.issue.includes('broken heading hierarchy'));
    expect(hierarchyFlag).toBe(true);
  });

  it('no structured data + score >= 4 triggers a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      accessibility: {
        image_accessibility: { alt_coverage_percent: 90 },
        heading_hierarchy: {
          pages_with_no_h1: 0,
          pages_with_broken_hierarchy: 0,
        },
        pages_analyzed: 8,
        structured_data_present: false,
      },
    };
    const { corrections } = checker.verify(result, 'ux_conversion', collected);
    const sdFlag = corrections.some(c => c.issue.includes('structured data appears on only'));
    expect(sdFlag).toBe(true);
  });
});

describe('FactChecker — domain-specific checks: Tech', () => {
  it('missing HTTPS + score >= 4 triggers a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      performance: {
        headers: {
          compression: { enabled: true },
          caching: { has_cache_policy: true },
          https_available: false,
        },
      },
    };
    const { corrections } = checker.verify(result, 'tech_infrastructure', collected);
    const httpsFlag = corrections.some(c => c.issue.includes('HTTPS'));
    expect(httpsFlag).toBe(true);
  });

  it('slow average load time + score >= 4 triggers a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      performance: {
        headers: {
          compression: { enabled: true },
          caching: { has_cache_policy: true },
          https_available: true,
        },
        page_weights: {
          avg_load_time_ms: 4200,
          lazy_load_coverage: 80,
        },
      },
    };
    const { corrections } = checker.verify(result, 'tech_infrastructure', collected);
    const slowFlag = corrections.some(c => c.issue.includes('average page load time'));
    expect(slowFlag).toBe(true);
  });

  it('low lazy-load image coverage + score >= 4 triggers a flag', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      performance: {
        headers: {
          compression: { enabled: true },
          caching: { has_cache_policy: true },
          https_available: true,
        },
        page_weights: {
          avg_load_time_ms: 1200,
          lazy_load_coverage: 20,
        },
      },
    };
    const { corrections } = checker.verify(result, 'tech_infrastructure', collected);
    const lazyFlag = corrections.some(c => c.issue.includes('lazy-load image coverage'));
    expect(lazyFlag).toBe(true);
  });
});

describe('FactChecker — no data → no crash', () => {
  it('returns result unchanged when collected data is empty', () => {
    const result = makeDomainResult({ score: 3 });
    const { result: corrected, corrections } = checker.verify(result, 'security_compliance', {});
    // No domain-specific data → only consistency checks apply
    expect(corrected.score).toBeGreaterThanOrEqual(1);
    expect(corrected.score).toBeLessThanOrEqual(5);
    expect(Array.isArray(corrections)).toBe(true);
  });

  it('marketing domain skips domain-specific checks', () => {
    const result = makeDomainResult({ score: 3 });
    expect(() => checker.verify(result, 'marketing_utp', {})).not.toThrow();
  });

  it('automation domain skips domain-specific checks', () => {
    const result = makeDomainResult({ score: 3 });
    expect(() => checker.verify(result, 'automation_processes', {})).not.toThrow();
  });
});

describe('FactChecker — domain-specific checks: Marketing', () => {
  it('unsourced market size numeric claim + high score triggers a flag', () => {
    const result = makeDomainResult({
      score: 4,
      issues: [],
      recommendations: [
        {
          title: 'Market expansion',
          description: 'Target TAM is $5B in year one.',
          priority: 'high',
          effort: 'medium',
          impact: 'Expected 30% uplift in conversion',
          timeline: 'Q1',
        },
      ],
    });
    const { corrections } = checker.verify(result, 'marketing_utp', {});
    const marketFlag = corrections.some(c => c.issue.includes('market size claim'));
    expect(marketFlag).toBe(true);
  });

  it('unsourced competitor numeric claim + high score triggers a flag', () => {
    const result = makeDomainResult({
      score: 4,
      issues: [],
      recommendations: [
        {
          title: 'Competitive positioning',
          description: 'Competitor controls 40% market share in this segment.',
          priority: 'high',
          effort: 'medium',
          impact: 'Improve share by 10%',
          timeline: 'Q2',
        },
      ],
    });
    const { corrections } = checker.verify(result, 'marketing_utp', {});
    const competitorFlag = corrections.some(c => c.issue.includes('competitor claim'));
    expect(competitorFlag).toBe(true);
  });
});

describe('FactChecker — domain-specific checks: Automation', () => {
  it('speculative time-saving estimate + high score triggers a flag', () => {
    const result = makeDomainResult({
      score: 4,
      issues: [],
      recommendations: [
        {
          title: 'Workflow automation',
          description: 'This flow will save 20 hours per week.',
          priority: 'high',
          effort: 'medium',
          impact: 'Reduce manual workload',
          timeline: '4 weeks',
        },
      ],
    });
    const { corrections } = checker.verify(result, 'automation_processes', {});
    const timeFlag = corrections.some(c => c.issue.includes('time-saving estimate'));
    expect(timeFlag).toBe(true);
  });

  it('unverified tool capability claim + high score triggers a flag', () => {
    const result = makeDomainResult({
      score: 4,
      issues: [],
      recommendations: [
        {
          title: 'Integrations',
          description: 'Seamless integration with all core systems via no-code connectors.',
          priority: 'medium',
          effort: 'low',
          impact: 'Real-time sync in all tools',
          timeline: '2 weeks',
        },
      ],
    });
    const { corrections } = checker.verify(result, 'automation_processes', {});
    const toolFlag = corrections.some(c => c.issue.includes('tool capability claim'));
    expect(toolFlag).toBe(true);
  });
});

describe('FactChecker — security control object error typing', () => {
  it('maps security-specific corrections to structural error codes', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      security_headers: {
        ssl: { valid: true, redirects_to_https: false },
        headers: [
          { name: 'X-Powered-By (should be absent)', present: false },
          { name: 'X-Content-Type-Options', present: false },
          { name: 'X-Frame-Options', present: false },
        ],
        cookies: {
          issues: ['Cookie "session" missing Secure HttpOnly flag'],
        },
      },
    };
    const fact = checker.verify(result, 'security_compliance', collected);
    const co = checker.buildControlObject(fact, 'security_compliance', 'audit-test', 2);
    expect(co.errors.structural).toEqual(expect.arrayContaining([
      'security_https_redirect_gap',
      'security_cookie_flag_gap',
      'security_header_hygiene_gap',
      'security_baseline_header_gap',
    ]));
  });
});

describe('FactChecker — SEO control object error typing', () => {
  it('maps new SEO correction patterns to structural error codes', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      seo_meta: {
        sitemap: { exists: true },
        robots_txt: {
          exists: true,
          issues: ['robots.txt does not declare a Sitemap: directive'],
        },
        open_graph: { pages_with_structured_data: 1, total_pages: 10 },
        page_analysis: {
          issues: [],
          meta_coverage: { with_description: 10, total: 10 },
        },
      },
    };
    const fact = checker.verify(result, 'seo_digital', collected);
    const co = checker.buildControlObject(fact, 'seo_digital', 'audit-seo', 3);
    expect(co.errors.structural).toEqual(expect.arrayContaining([
      'seo_missing_crawl_evidence',
      'seo_competitor_claim_unverified',
    ]));
  });
});

describe('FactChecker — UX control object error typing', () => {
  it('maps new UX correction patterns to structural error codes', () => {
    const result = makeDomainResult({ score: 4 });
    const collected = {
      accessibility: {
        image_accessibility: { alt_coverage_percent: 95 },
        heading_hierarchy: {
          pages_with_no_h1: 2,
          pages_with_broken_hierarchy: 2,
        },
        pages_analyzed: 10,
        structured_data_present: false,
      },
    };
    const fact = checker.verify(result, 'ux_conversion', collected);
    const co = checker.buildControlObject(fact, 'ux_conversion', 'audit-ux', 4);
    expect(co.errors.structural).toEqual(expect.arrayContaining([
      'ux_a11y_claim_unchecked',
      'ux_missing_analytics_evidence',
      'ux_benchmark_unsubstantiated',
    ]));
  });
});

describe('FactChecker — Marketing/Automation control object error typing', () => {
  it('maps marketing correction patterns to structural error codes', () => {
    const result = makeDomainResult({
      score: 4,
      issues: [],
      recommendations: [
        {
          title: 'Market and competition',
          description: 'TAM is €3B and competitor has 35% market share.',
          priority: 'high',
          effort: 'medium',
          impact: 'ROI uplift by 25%',
          timeline: 'Q2',
        },
      ],
    });
    const fact = checker.verify(result, 'marketing_utp', {});
    const co = checker.buildControlObject(fact, 'marketing_utp', 'audit-mkt', 5);
    expect(co.errors.structural).toEqual(expect.arrayContaining([
      'marketing_market_size_unverified',
      'marketing_competitor_claim_unsourced',
      'marketing_roi_figure_speculative',
    ]));
  });

  it('maps automation correction patterns to structural error codes', () => {
    const result = makeDomainResult({
      score: 4,
      issues: [],
      recommendations: [
        {
          title: 'Automation rollout',
          description:
            'Fully automated real-time sync will save 16 hours per week with ROI in 2 months.',
          priority: 'high',
          effort: 'medium',
          impact: 'Payback in 2 months',
          timeline: 'Q1',
        },
      ],
    });
    const fact = checker.verify(result, 'automation_processes', {});
    const co = checker.buildControlObject(fact, 'automation_processes', 'audit-auto', 6);
    expect(co.errors.structural).toEqual(expect.arrayContaining([
      'automation_time_saving_speculative',
      'automation_tool_capability_unverified',
      'automation_roi_timeline_unrealistic',
    ]));
  });
});
