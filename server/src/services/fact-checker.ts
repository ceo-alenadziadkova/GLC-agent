import { FACT_CHECKER_THRESHOLDS } from '../config/fact-checker-thresholds.js';
import { factCheckerCopy, interpolateFactCheckerMessage } from '../config/fact-checker-copy.js';
import type { DomainResult, DomainKey, ConfidenceLevel } from '../types/audit.js';
import {
  createControlObjectV1,
  type ControlObjectV1,
  type PhaseId,
  type ExecutionMode,
} from '../schemas/control-object.js';
import {
  getPhaseProfile,
  mapDataSourceToTruthSource,
} from '../config/truth-registry.js';
import {
  feasibilityLayer,
  type BriefSnapshot,
} from './feasibility-layer.js';
import {
  getConfidenceWeights,
  computeWeightedConfidence,
} from '../config/phase-confidence-weights.js';
import { applyExecutionMode } from '../config/safety-mode.js';
import { computePerformanceMetrics, MIN_EVALUATION_COUNT } from './agent-performance.js';

const T = FACT_CHECKER_THRESHOLDS;

export interface FactCheckResult {
  result: DomainResult;
  corrections: FactCorrection[];
  /** 0–1 overall confidence in the score, derived from corrections + finding confidences. */
  confidence: number;
}

export interface FactCorrection {
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

  /**
   * Builds CONTROL_OBJECT v1 from a completed FactCheckResult.
   *
   * Call this AFTER verify() to produce the governance contract.
   * Non-breaking: verify() signature and return value are unchanged.
   *
   * Claim extraction approach (v1 light):
   *  - Each AuditIssue   → 1 FACT claim (high-risk if critical/high severity)
   *  - Recommendations   → counted as STRATEGIC_HYPOTHESIS
   *  - Strengths/weaknesses → counted as OPINION
   *  - unknown_items     → data_gaps errors
   *
   * Status assignment:
   *  - override correction → likely_hallucination
   *  - flag correction     → unverified
   *  - data_source='from_brief' issues → confirmed_brief
   *  - risky language detected → risky_promise
   */
  buildControlObject(
    factCheckResult: FactCheckResult,
    domainKey: DomainKey,
    auditId: string,
    phaseNumber: number,
    executionMode: ExecutionMode = 'normal',
    /** v1.7+: brief snapshot for feasibility assessment. Pass {} or omit for phases without brief context. */
    brief: BriefSnapshot = {}
  ): ControlObjectV1 {
    const { result, corrections, confidence: factualRaw } = factCheckResult;

    // v1.5: load phase profile for truth_profile_id and domain-specific error types
    const profile = getPhaseProfile(domainKey);
    const truthProfileId = profile?.phase_id ?? null;

    const co = createControlObjectV1(auditId, domainKey as PhaseId, executionMode, truthProfileId);

    // ─── Counts ───────────────────────────────────────────────
    const issues = result.issues ?? [];
    const recommendations = result.recommendations ?? [];
    const strengthsCount = (result.strengths ?? []).length;
    const weaknessesCount = (result.weaknesses ?? []).length;

    const factCount = issues.length;                                          // issues = verifiable claims
    const hypothesisCount = recommendations.length;                           // recs are strategic bets
    const opinionCount = strengthsCount + weaknessesCount;                    // s/w = qualitative views

    co.counts.fact = factCount;
    co.counts.strategic_hypothesis = hypothesisCount;
    co.counts.opinion = opinionCount;
    co.counts.total_claims = factCount + hypothesisCount + opinionCount;

    // ─── Statuses ─────────────────────────────────────────────
    // Overrides = hard conflicts with evidence → likely_hallucination
    co.counts.statuses.likely_hallucination = corrections.filter(c => c.action === 'override').length;

    // Flags = suspicious but not confirmed → unverified
    co.counts.statuses.unverified = corrections.filter(c => c.action === 'flag').length;

    // Brief-sourced issues = confirmed by client context
    co.counts.statuses.confirmed_brief = issues.filter(i => i.data_source === 'from_brief').length;

    // Risky promise detection: look for absolute/guarantee language in issue descriptions
    const riskyPattern = /\b(guarantee|guaranteed|definitely|certainly|always|never|100%|will increase|will reduce)\b/i;
    co.counts.statuses.risky_promise = recommendations.filter(r =>
      riskyPattern.test(r.description) || riskyPattern.test(r.impact)
    ).length;

    // ─── Errors ───────────────────────────────────────────────
    // data_gaps from unknown_items
    for (const item of result.unknown_items ?? []) {
      const key = item.length > 60 ? item.slice(0, 57) + '...' : item;
      co.errors.data_gaps.push(key);
    }

    // structural: score-severity mismatches (derived from corrections)
    if (corrections.some(c => c.field === 'score' && c.action === 'override')) {
      co.errors.structural.push('score_evidence_mismatch');
    }

    // v1.5: domain-specific structural errors from phase profile
    // If any correction's issue text matches a known error_type pattern, surface it
    if (profile) {
      for (const errorType of profile.error_types) {
        const keyword = errorType.replace(/_/g, ' ');
        const matchesCorrection = corrections.some(c =>
          c.issue.toLowerCase().includes(keyword) || c.raw_evidence.toLowerCase().includes(keyword)
        );
        if (matchesCorrection && !co.errors.structural.includes(errorType)) {
          co.errors.structural.push(errorType);
        }
      }
    }

    // fixable: flag-type corrections that are tone/wording issues
    if (corrections.some(c => c.action === 'flag')) {
      co.errors.fixable.push('score_consistency_flag');
    }

    // fixable: risky promise language
    if (co.counts.statuses.risky_promise > 0) {
      co.errors.fixable.push('risky_promise_language');
    }

    // ─── Assumptions (v1.5: with risk + related_claim_ids) ───────────────────
    // Map low-confidence inferred findings → explicit assumptions
    // Build a claim_id lookup keyed by issue title for related_claim_ids
    const issueTitleToClaimId = new Map<string, number>(
      issues.map((iss, idx) => [iss.title, idx + 1])
    );

    let assumptionIdx = 1;
    for (let issueIdx = 0; issueIdx < issues.length; issueIdx++) {
      const issue = issues[issueIdx];
      if (issue.confidence === 'low' && issue.data_source === 'inferred') {
        // Determine risk based on phase profile default + severity boost
        const baseRisk = profile?.default_assumption_risk ?? 'low';
        const risk: 'low' | 'medium' | 'high' =
          issue.severity === 'critical' ? 'high'
          : issue.severity === 'high' ? (baseRisk === 'low' ? 'medium' : baseRisk)
          : baseRisk;

        // related_claim_ids: same-section issues that reference this finding
        // For v1.5 we link the assumption to its source claim only
        const relatedClaimId = issueTitleToClaimId.get(issue.title);
        const relatedIds = relatedClaimId !== undefined ? [relatedClaimId] : [];

        co.assumptions.push({
          id: `A${assumptionIdx++}`,
          statement: `Finding inferred without direct evidence: "${issue.title}"`,
          source: 'inferred_from_pattern',
          risk,
          related_claim_ids: relatedIds,
        });
      }
    }
    co.counts.assumption = co.assumptions.length;

    // ─── Trace ────────────────────────────────────────────────
    // Map each issue to a claim source (phase = agent number for v1)
    // v1.5: truth_source resolved via Truth Registry helper (canonical mapping)
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const truthSource = mapDataSourceToTruthSource(issue.data_source ?? 'inferred');

      co.trace.claim_sources.push({
        claim_id: i + 1,
        agent: phaseNumber,
        section: `Phase ${phaseNumber} — ${domainKey}`,
        truth_source: truthSource,
      });
    }

    // ─── Feasibility (v1.7) ───────────────────────────────────
    const feasibilityResult = feasibilityLayer.assess(domainKey, result, brief);
    co.feasibility = {
      score: feasibilityResult.score,
      risk_codes: feasibilityResult.risks.map(r => r.code),
      notes: feasibilityResult.notes,
    };

    // ─── Confidence (v1.7: weighted per-phase formula) ────────
    // factual: from FactChecker.calculateConfidence() (converted 0–1 → 0–100)
    const factual = Math.round(factualRaw * 100);

    // strategic: degrade if many unverified recs or risky promises
    const riskyRatio = factCount > 0 ? co.counts.statuses.risky_promise / Math.max(hypothesisCount, 1) : 0;
    const unverifiedRatio = factCount > 0 ? co.counts.statuses.unverified / factCount : 0;
    const strategic = Math.max(0, Math.round(100 - (riskyRatio * 30) - (unverifiedRatio * 20)));

    // consistency: degrade if structural errors present
    const structuralPenalty = co.errors.structural.length * 15;
    const hallucinationPenalty = co.counts.statuses.likely_hallucination * 20;
    const consistency = Math.max(0, 100 - structuralPenalty - hallucinationPenalty);

    // feasibility: score × 100
    const feasibilityScore = Math.round(feasibilityResult.score * 100);

    // overall: phase-specific weighted formula (replaces simple average from v1.5)
    const weights = getConfidenceWeights(domainKey);
    const overall = computeWeightedConfidence(factual, strategic, consistency, feasibilityScore, weights);

    co.confidence = { overall, factual, strategic, consistency, feasibility: feasibilityScore };
    co.confidence_weights = weights;

    // decision_hint is set only by DecisionLayer in PipelineOrchestrator (single source of truth).

    // ─── Human Attention ──────────────────────────────────────
    const dataGapCount = co.errors.data_gaps.length;
    // v1.5: count only high-risk assumptions (not all) — low/medium are advisory only
    const highRiskAssumptionCount = co.assumptions.filter(a => a.risk === 'high').length;
    // also escalate if many medium-risk assumptions accumulate
    const mediumRiskAssumptionCount = co.assumptions.filter(a => a.risk === 'medium').length;
    const assumptionsEscalate = highRiskAssumptionCount >= 2 || mediumRiskAssumptionCount >= 5;
    // v1.7: critically low feasibility (≤0.35) also requires human attention
    const feasibilityTooLow = feasibilityResult.score <= 0.35;

    if (
      co.counts.statuses.likely_hallucination >= 3 ||
      dataGapCount >= 5 ||
      assumptionsEscalate ||
      feasibilityTooLow
    ) {
      co.human_attention_required.required = true;

      if (co.counts.statuses.likely_hallucination >= 3) {
        co.human_attention_required.reasons.push('high_hallucination_count');
      }
      if (dataGapCount >= 5) {
        co.human_attention_required.reasons.push('critical_data_gaps');
      }
      if (assumptionsEscalate) {
        co.human_attention_required.reasons.push('high_risk_assumptions');
      }
      if (feasibilityTooLow) {
        co.human_attention_required.reasons.push('critically_low_feasibility');
      }
    }

    // ─── v1.8: Safety Mode Guardrails ────────────────────────
    // Mutates co.human_attention_required and co.errors.fixable if execution_mode='safe'.
    // No-op for 'normal' mode. Always runs last so all base counts/errors are populated.
    applyExecutionMode(co);

    // ─── v2.0: Agent Performance Snapshot ────────────────────
    // Compute per-run metrics and embed in CONTROL_OBJECT for per-run observability.
    // Async persistence to agent_performance_aggregate is handled by the pipeline.
    const perfMetrics = computePerformanceMetrics(co, phaseNumber);
    if (perfMetrics) {
      co.agent_performance = {
        agent_number: perfMetrics.agent_number,
        hallucination_rate: perfMetrics.hallucination_rate,
        risky_promise_rate: perfMetrics.risky_promise_rate,
        unverified_rate: perfMetrics.unverified_rate,
        inconsistency_rate: perfMetrics.inconsistency_rate,
        agent_score: perfMetrics.agent_score,
        // Score is reliable only after MIN_EVALUATION_COUNT aggregate runs —
        // single-run snapshot is always marked unreliable until aggregate confirms
        score_reliable: false,
      };
    }

    return co;
  }
}
