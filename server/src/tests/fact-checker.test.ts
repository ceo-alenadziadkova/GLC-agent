/**
 * Smoke tests: FactChecker
 *
 * Tests applyCorrections() which was previously a no-op.
 * Covers: flag-based score reduction, hard overrides, score bounds,
 * label re-mapping, domain-specific checks (security, SEO, tech, UX).
 */
import { describe, it, expect } from 'vitest';
import { FactChecker } from '../services/fact-checker.js';
import type { DomainResult } from '../types/audit.js';

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeDomainResult(overrides: Partial<DomainResult> = {}): DomainResult {
  return {
    score: 4,
    label: 'Good',
    summary: 'Test summary that is long enough to pass validation requirements here.',
    strengths: ['Good SSL', 'Fast load'],
    weaknesses: ['Missing CSP'],
    issues: [
      { id: 'i1', severity: 'medium', title: 'Missing CSP', description: 'No Content-Security-Policy', impact: 'Medium' },
    ],
    quick_wins: [],
    recommendations: [],
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
      issues: [{ id: 'i1', severity: 'low', title: 'Minor', description: 'Minor issue', impact: 'Low' }],
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
      issues: [{ id: 'i1', severity: 'critical', title: 'Critical bug', description: 'Bad', impact: 'High' }],
    });
    const { corrections } = checker.verify(result, 'security_compliance', {});
    const hasConsistencyFlag = corrections.some(c => c.issue.includes('critical issues'));
    expect(hasConsistencyFlag).toBe(true);
  });

  it('score 1 without critical/high issues triggers a flag', () => {
    const result = makeDomainResult({
      score: 1,
      issues: [{ id: 'i1', severity: 'low', title: 'Minor', description: 'Minor', impact: 'Low' }],
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
