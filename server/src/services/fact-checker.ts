import type { DomainResult, DomainKey } from '../types/audit.js';

interface FactCheckResult {
  result: DomainResult;
  corrections: FactCorrection[];
  confidence: number; // 0-1 how confident we are in the score
}

interface FactCorrection {
  field: string;
  issue: string;
  raw_evidence: string;
  action: 'flag' | 'override';
  original_value?: unknown;
  corrected_value?: unknown;
}

/**
 * Validates Claude's analysis against raw collected data.
 * Catches hallucinations and score inconsistencies.
 */
export class FactChecker {
  verify(
    result: DomainResult,
    domainKey: DomainKey,
    collectedData: Record<string, Record<string, unknown>>
  ): FactCheckResult {
    const corrections: FactCorrection[] = [];

    // Domain-specific checks
    switch (domainKey) {
      case 'security_compliance':
        this.checkSecurity(result, collectedData, corrections);
        break;
      case 'seo_digital':
        this.checkSeo(result, collectedData, corrections);
        break;
      case 'tech_infrastructure':
        this.checkTech(result, collectedData, corrections);
        break;
      case 'ux_conversion':
        this.checkUx(result, collectedData, corrections);
        break;
      default:
        // Marketing and Automation rely more on qualitative analysis
        break;
    }

    // General checks
    this.checkScoreConsistency(result, corrections);

    // Calculate confidence
    const confidence = corrections.length === 0 ? 1.0
      : corrections.filter(c => c.action === 'override').length > 0 ? 0.5
      : 0.8;

    return {
      result: this.applyCorrections(result, corrections),
      corrections,
      confidence,
    };
  }

  private checkSecurity(
    result: DomainResult,
    collected: Record<string, Record<string, unknown>>,
    corrections: FactCorrection[]
  ) {
    const secData = collected['security_headers'];
    if (!secData) return;

    const ssl = secData.ssl as { valid: boolean } | undefined;
    const headers = secData.headers as Array<{ name: string; present: boolean }> | undefined;

    if (ssl && !ssl.valid && result.score >= 4) {
      corrections.push({
        field: 'score',
        issue: 'Score too high: SSL certificate is invalid or missing',
        raw_evidence: 'SSL check returned invalid',
        action: 'flag',
      });
    }

    if (headers) {
      const missingCritical = headers.filter(h =>
        ['Content-Security-Policy', 'Strict-Transport-Security'].some(name =>
          h.name.includes(name)
        ) && !h.present
      );

      if (missingCritical.length >= 2 && result.score >= 4) {
        corrections.push({
          field: 'score',
          issue: `Score too high: ${missingCritical.length} critical security headers missing (CSP, HSTS)`,
          raw_evidence: `Missing: ${missingCritical.map(h => h.name).join(', ')}`,
          action: 'flag',
        });
      }
    }
  }

  private checkSeo(
    result: DomainResult,
    collected: Record<string, Record<string, unknown>>,
    corrections: FactCorrection[]
  ) {
    const seoData = collected['seo_meta'];
    if (!seoData) return;

    const sitemap = seoData.sitemap as { exists: boolean } | undefined;
    const robotsTxt = seoData.robots_txt as { exists: boolean } | undefined;
    const pageAnalysis = seoData.page_analysis as { issues: string[]; meta_coverage: { with_description: number; total: number } } | undefined;

    // Can't score 5 without sitemap
    if (sitemap && !sitemap.exists && result.score === 5) {
      corrections.push({
        field: 'score',
        issue: 'Score 5/5 but no sitemap.xml found',
        raw_evidence: 'sitemap.exists = false',
        action: 'flag',
      });
    }

    // Can't score 5 without robots.txt
    if (robotsTxt && !robotsTxt.exists && result.score === 5) {
      corrections.push({
        field: 'score',
        issue: 'Score 5/5 but no robots.txt found',
        raw_evidence: 'robots_txt.exists = false',
        action: 'flag',
      });
    }

    // Low meta coverage should lower score
    if (pageAnalysis?.meta_coverage) {
      const coverage = pageAnalysis.meta_coverage.with_description / pageAnalysis.meta_coverage.total;
      if (coverage < 0.5 && result.score >= 4) {
        corrections.push({
          field: 'score',
          issue: `Score too high: only ${Math.round(coverage * 100)}% of pages have meta descriptions`,
          raw_evidence: `${pageAnalysis.meta_coverage.with_description}/${pageAnalysis.meta_coverage.total} pages`,
          action: 'flag',
        });
      }
    }
  }

  private checkTech(
    result: DomainResult,
    collected: Record<string, Record<string, unknown>>,
    corrections: FactCorrection[]
  ) {
    const perfData = collected['performance'];
    if (!perfData) return;

    const headers = perfData.headers as { compression: { enabled: boolean }; caching: { has_cache_policy: boolean } } | undefined;

    if (headers) {
      if (!headers.compression.enabled && result.score >= 4) {
        corrections.push({
          field: 'score',
          issue: 'Score too high: no HTTP compression detected',
          raw_evidence: 'compression.enabled = false',
          action: 'flag',
        });
      }

      if (!headers.caching.has_cache_policy && result.score >= 4) {
        corrections.push({
          field: 'score',
          issue: 'Score too high: no cache policy detected',
          raw_evidence: 'caching.has_cache_policy = false',
          action: 'flag',
        });
      }
    }
  }

  private checkUx(
    result: DomainResult,
    collected: Record<string, Record<string, unknown>>,
    corrections: FactCorrection[]
  ) {
    const a11y = collected['accessibility'];
    if (!a11y) return;

    const imageA11y = a11y.image_accessibility as { alt_coverage_percent: number } | undefined;

    if (imageA11y && imageA11y.alt_coverage_percent < 50 && result.score >= 4) {
      corrections.push({
        field: 'score',
        issue: `Score too high: only ${imageA11y.alt_coverage_percent}% image alt text coverage`,
        raw_evidence: `alt_coverage_percent = ${imageA11y.alt_coverage_percent}`,
        action: 'flag',
      });
    }
  }

  private checkScoreConsistency(result: DomainResult, corrections: FactCorrection[]) {
    // Score 5 should not have critical issues
    if (result.score === 5 && result.issues.some(i => i.severity === 'critical')) {
      corrections.push({
        field: 'score',
        issue: 'Score 5/5 but critical issues found',
        raw_evidence: `Critical issues: ${result.issues.filter(i => i.severity === 'critical').map(i => i.title).join(', ')}`,
        action: 'flag',
      });
    }

    // Score 1 should have at least one critical issue
    if (result.score === 1 && !result.issues.some(i => i.severity === 'critical' || i.severity === 'high')) {
      corrections.push({
        field: 'score',
        issue: 'Score 1/5 but no critical or high issues listed',
        raw_evidence: 'Max severity in issues: ' + (result.issues[0]?.severity ?? 'none'),
        action: 'flag',
      });
    }

    // Strengths/weaknesses balance
    if (result.score >= 4 && result.weaknesses.length > result.strengths.length * 2) {
      corrections.push({
        field: 'score',
        issue: 'High score but significantly more weaknesses than strengths',
        raw_evidence: `Strengths: ${result.strengths.length}, Weaknesses: ${result.weaknesses.length}`,
        action: 'flag',
      });
    }
  }

  private applyCorrections(result: DomainResult, corrections: FactCorrection[]): DomainResult {
    // For now, we only flag — we don't auto-correct scores.
    // Corrections are logged for the consultant to review.
    // In the future, we could add auto-correction rules.
    return result;
  }
}
