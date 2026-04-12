import { FACT_CHECKER_THRESHOLDS } from '../config/fact-checker-thresholds.js';
import { factCheckerCopy, interpolateFactCheckerMessage } from '../config/fact-checker-copy.js';
import type { DomainResult, DomainKey, ConfidenceLevel } from '../types/audit.js';

const T = FACT_CHECKER_THRESHOLDS;

interface FactCheckResult {
  result: DomainResult;
  corrections: FactCorrection[];
  /** 0–1 overall confidence in the score, derived from corrections + finding confidences. */
  confidence: number;
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

    // Calculate confidence — blend structural corrections with per-finding confidence levels
    const confidence = this.calculateConfidence(result, corrections);

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

    const secCopy = factCheckerCopy().security;
    if (ssl && !ssl.valid) {
      corrections.push({
        field: 'score',
        issue: secCopy.invalidSslIssue,
        raw_evidence: secCopy.invalidSslRawEvidence,
        action: 'override',
        original_value: result.score,
        corrected_value: Math.min(result.score, T.security.invalidSslMaxScore),
      });
    }

    if (headers) {
      const missingCritical = headers.filter(h =>
        ['Content-Security-Policy', 'Strict-Transport-Security'].some(name =>
          h.name.includes(name)
        ) && !h.present
      );

      if (
        missingCritical.length >= T.security.missingCriticalHeadersMinCount &&
        result.score >= T.security.missingCriticalHeadersFlagMinScore
      ) {
        corrections.push({
          field: 'score',
          issue: interpolateFactCheckerMessage(secCopy.missingCriticalIssueTemplate, {
            count: missingCritical.length,
          }),
          raw_evidence: interpolateFactCheckerMessage(secCopy.missingCriticalRawEvidenceTemplate, {
            names: missingCritical.map(h => h.name).join(', '),
          }),
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
    const seoCopy = factCheckerCopy().seo;

    // Can't score 5 without sitemap
    if (sitemap && !sitemap.exists && result.score === T.seo.perfectScore) {
      corrections.push({
        field: 'score',
        issue: seoCopy.noSitemapIssue,
        raw_evidence: seoCopy.noSitemapRawEvidence,
        action: 'flag',
      });
    }

    // Can't score 5 without robots.txt
    if (robotsTxt && !robotsTxt.exists && result.score === T.seo.perfectScore) {
      corrections.push({
        field: 'score',
        issue: seoCopy.noRobotsIssue,
        raw_evidence: seoCopy.noRobotsRawEvidence,
        action: 'flag',
      });
    }

    // Low meta coverage should lower score
    if (pageAnalysis?.meta_coverage) {
      const coverage = pageAnalysis.meta_coverage.with_description / pageAnalysis.meta_coverage.total;
      if (coverage < T.seo.metaDescriptionMinCoverage && result.score >= T.seo.metaDescriptionFlagMinScore) {
        corrections.push({
          field: 'score',
          issue: interpolateFactCheckerMessage(seoCopy.metaCoverageIssueTemplate, {
            pct: Math.round(coverage * 100),
          }),
          raw_evidence: interpolateFactCheckerMessage(seoCopy.metaCoverageRawEvidenceTemplate, {
            with_desc: pageAnalysis.meta_coverage.with_description,
            total: pageAnalysis.meta_coverage.total,
          }),
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
    const techCopy = factCheckerCopy().tech;

    if (headers) {
      if (!headers.compression.enabled && result.score >= T.tech.flagMinScore) {
        corrections.push({
          field: 'score',
          issue: techCopy.noCompressionIssue,
          raw_evidence: techCopy.noCompressionRawEvidence,
          action: 'flag',
        });
      }

      if (!headers.caching.has_cache_policy && result.score >= T.tech.flagMinScore) {
        corrections.push({
          field: 'score',
          issue: techCopy.noCacheIssue,
          raw_evidence: techCopy.noCacheRawEvidence,
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
    const uxCopy = factCheckerCopy().ux;

    if (
      imageA11y &&
      imageA11y.alt_coverage_percent < T.ux.imageAltMinCoveragePercent &&
      result.score >= T.ux.flagMinScore
    ) {
      corrections.push({
        field: 'score',
        issue: interpolateFactCheckerMessage(uxCopy.imageAltIssueTemplate, {
          pct: imageA11y.alt_coverage_percent,
        }),
        raw_evidence: interpolateFactCheckerMessage(uxCopy.imageAltRawEvidenceTemplate, {
          pct: imageA11y.alt_coverage_percent,
        }),
        action: 'flag',
      });
    }
  }

  private checkScoreConsistency(result: DomainResult, corrections: FactCorrection[]) {
    const cCopy = factCheckerCopy().consistency;
    // Score 5 should not have critical issues
    if (result.score === T.consistency.maxScore && result.issues.some(i => i.severity === 'critical')) {
      corrections.push({
        field: 'score',
        issue: cCopy.criticalWithMaxScoreIssue,
        raw_evidence: interpolateFactCheckerMessage(cCopy.criticalWithMaxScoreRawEvidenceTemplate, {
          titles: result.issues.filter(i => i.severity === 'critical').map(i => i.title).join(', '),
        }),
        action: 'flag',
      });
    }

    // Score 1 should have at least one critical issue
    if (
      result.score === T.consistency.minScore &&
      !result.issues.some(i => i.severity === 'critical' || i.severity === 'high')
    ) {
      corrections.push({
        field: 'score',
        issue: cCopy.minScoreNoSevereIssue,
        raw_evidence: interpolateFactCheckerMessage(cCopy.minScoreNoSevereRawEvidenceTemplate, {
          max_severity: result.issues[0]?.severity ?? 'none',
        }),
        action: 'flag',
      });
    }

    // Strengths/weaknesses balance
    if (
      result.score >= T.consistency.highScoreFlagMin &&
      result.weaknesses.length > result.strengths.length * T.consistency.strengthsToWeaknessesRatio
    ) {
      corrections.push({
        field: 'score',
        issue: cCopy.weaknessesBalanceIssue,
        raw_evidence: interpolateFactCheckerMessage(cCopy.weaknessesBalanceRawEvidenceTemplate, {
          strengths: result.strengths.length,
          weaknesses: result.weaknesses.length,
        }),
        action: 'flag',
      });
    }
  }

  /**
   * Calculates an overall confidence score (0–1) by combining:
   * 1. Structural corrections (overrides lower confidence more than flags)
   * 2. Per-finding confidence levels reported by the agent
   *
   * Rules:
   * - Start at 1.0
   * - Each 'override' correction: -0.2
   * - Each 'flag' correction: -0.1 (max deduction from flags: -0.2)
   * - Finding-level confidence ratio: if >50% of issues are 'low': -0.15; if >50% 'medium': -0.05
   * - Final value clamped to [0, 1]
   */
  private calculateConfidence(result: DomainResult, corrections: FactCorrection[]): number {
    let score = 1.0;

    const overrideCount = corrections.filter(c => c.action === 'override').length;
    const flagCount = corrections.filter(c => c.action === 'flag').length;
    score -= overrideCount * T.confidence.perOverrideDeduction;
    score -= Math.min(flagCount * T.confidence.perFlagDeduction, T.confidence.maxFlagDeduction);

    // Factor in per-finding confidence levels
    if (result.issues.length > 0) {
      const lowCount = result.issues.filter(i => (i.confidence as ConfidenceLevel) === 'low').length;
      const mediumCount = result.issues.filter(i => (i.confidence as ConfidenceLevel) === 'medium').length;
      const ratio = (level: number) => level / result.issues.length;

      if (ratio(lowCount) > T.confidence.lowConfidenceIssueRatio) score -= T.confidence.lowConfidencePenalty;
      else if (ratio(mediumCount) > T.confidence.lowConfidenceIssueRatio)
        score -= T.confidence.mediumConfidencePenalty;
    }

    return Math.max(0, Math.min(1, score));
  }

  private applyCorrections(result: DomainResult, corrections: FactCorrection[]): DomainResult {
    if (corrections.length === 0) return result;

    let { score } = result;

    // 1. Apply hard overrides first (action: 'override' with explicit corrected_value)
    for (const c of corrections) {
      if (c.action === 'override' && c.field === 'score' && c.corrected_value !== undefined) {
        score = c.corrected_value as number;
      }
    }

    // 2. For each "score too high" flag, cap by 1 point per flag (max reduction: 2)
    //    This prevents over-correction while still forcing inflated scores down.
    const scoreFlags = corrections.filter(c => c.action === 'flag' && c.field === 'score');
    if (scoreFlags.length > 0) {
      const reduction = Math.min(scoreFlags.length, T.applyScore.maxReductionSteps);
      score = Math.max(T.applyScore.minScoreAfterReduction, score - reduction);
    }

    if (score === result.score) return result; // No change needed

    return {
      ...result,
      score,
      // Recalculate label to stay consistent with the new score
      label: this.scoreLabel(score),
    };
  }

  private scoreLabel(score: number): string {
    const L = factCheckerCopy().scoreLabels;
    if (score <= 1) return L.critical;
    if (score <= 2) return L.needsWork;
    if (score <= 3) return L.moderate;
    if (score <= 4) return L.good;
    return L.excellent;
  }
}
