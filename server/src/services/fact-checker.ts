import { FACT_CHECKER_THRESHOLDS } from '../config/fact-checker-thresholds.js';
import { factCheckerCopy, interpolateFactCheckerMessage } from '../config/fact-checker-copy.js';
import type { DomainResult, DomainKey, ConfidenceLevel } from '../types/audit.js';
import {
  createControlObjectV1,
  CONTROL_OBJECT_VERSIONS_CAUSAL_DAG,
  type ControlObjectV1,
  type PhaseId,
  type ExecutionMode,
  type ControlObjectCausalChainEntry,
  type ControlObjectCausalClaimRef,
} from '../schemas/control-object.js';
import { isCausalDagEnabled } from '../config/feature-flags.js';
import { isStrictlyBeforePhase, isKnownPhaseId } from '../config/phase-order.js';
import { logger } from './logger.js';
import {
  mapDataSourceToTruthSource,
  getHighestPrioritySource,
  normalizeTruthSourcesList,
  type TruthSourceId,
} from '../config/truth-registry.js';
import { getExtendedPhaseProfile } from '../config/phase-profiles.js';
import {
  feasibilityLayer,
  type BriefSnapshot,
} from './feasibility-layer.js';
import { computeWeightedConfidence } from '../config/phase-confidence-weights.js';
import { applyExecutionMode } from '../config/safety-mode.js';
import { computePerformanceMetrics } from './agent-performance.js';
import type { ConnectorRunResult } from './connector-runner.js';

const T = FACT_CHECKER_THRESHOLDS;

/** Optional governance fields populated from audit row + pipeline (CONTROL_OBJECT v2.1+). */
export interface BuildControlObjectGovernanceInput {
  riskProfile?: 'low' | 'medium' | 'high' | 'enterprise' | null;
  /** Bandit-selected variant id, including `default` when exploration uses the baseline arm. */
  selectedVariantId?: string;
}

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

type DomainCollectorCheck = (
  self: FactChecker,
  result: DomainResult,
  collected: Record<string, Record<string, unknown>>,
  corrections: FactCorrection[],
) => void;

function dedupeCausalRefs(refs: ControlObjectCausalClaimRef[]): ControlObjectCausalClaimRef[] {
  const seen = new Set<string>();
  const out: ControlObjectCausalClaimRef[] = [];
  for (const r of refs) {
    const k = `${r.phase_id}:${r.claim_id}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}

/**
 * Validates Claude's analysis against raw collected data.
 * Catches hallucinations and score inconsistencies.
 */
export class FactChecker {
  /**
   * Per-domain hooks that run collector-backed checks before global consistency rules.
   * Phases without entries (e.g. marketing_utp, automation_processes) rely on qualitative analysis only.
   */
  private static readonly domainCollectorChecks: Partial<Record<DomainKey, DomainCollectorCheck>> = {
    security_compliance: (self, result, collected, corrections) =>
      self.checkSecurity(result, collected, corrections),
    seo_digital: (self, result, collected, corrections) => self.checkSeo(result, collected, corrections),
    tech_infrastructure: (self, result, collected, corrections) => self.checkTech(result, collected, corrections),
    ux_conversion: (self, result, collected, corrections) => self.checkUx(result, collected, corrections),
  };

  verify(
    result: DomainResult,
    domainKey: DomainKey,
    collectedData: Record<string, Record<string, unknown>>
  ): FactCheckResult {
    const corrections: FactCorrection[] = [];

    const domainHook = FactChecker.domainCollectorChecks[domainKey];
    if (domainHook) {
      domainHook(this, result, collectedData, corrections);
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
    const cookies = secData.cookies as { issues?: string[] } | undefined;

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

      const hygieneFailures = headers.filter(h =>
        ['X-Powered-By (should be absent)', 'Server (should be minimal)'].includes(h.name) && !h.present
      );

      if (
        hygieneFailures.length >= T.security.hygieneHeadersMinCount &&
        result.score >= T.security.missingCriticalHeadersFlagMinScore
      ) {
        corrections.push({
          field: 'score',
          issue: interpolateFactCheckerMessage(secCopy.headerHygieneIssueTemplate, {
            count: hygieneFailures.length,
          }),
          raw_evidence: interpolateFactCheckerMessage(secCopy.headerHygieneRawEvidenceTemplate, {
            names: hygieneFailures.map(h => h.name).join(', '),
          }),
          action: 'flag',
        });
      }
    }

    const cookieIssues = cookies?.issues ?? [];
    if (
      cookieIssues.length >= T.security.cookieIssuesMinCount &&
      result.score >= T.security.missingCriticalHeadersFlagMinScore
    ) {
      corrections.push({
        field: 'score',
        issue: interpolateFactCheckerMessage(secCopy.cookieFlagsIssueTemplate, {
          count: cookieIssues.length,
        }),
        raw_evidence: interpolateFactCheckerMessage(secCopy.cookieFlagsRawEvidenceTemplate, {
          issues: cookieIssues.slice(0, 3).join(' | '),
        }),
        action: 'flag',
      });
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

    const headers = perfData.headers as {
      compression: { enabled: boolean };
      caching: { has_cache_policy: boolean };
      https_available?: boolean;
    } | undefined;
    const pageWeights = perfData.page_weights as {
      avg_load_time_ms: number;
      lazy_load_coverage: number;
    } | undefined;
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

      if (headers.https_available === false) {
        if (result.score >= T.tech.flagMinScore) {
          corrections.push({
            field: 'score',
            issue: techCopy.noHttpsIssue,
            raw_evidence: techCopy.noHttpsRawEvidence,
            action: 'flag',
          });
        }
      }
    }

    if (pageWeights) {
      if (
        pageWeights.avg_load_time_ms > T.tech.maxAvgLoadTimeMs &&
        result.score >= T.tech.flagMinScore
      ) {
        corrections.push({
          field: 'score',
          issue: interpolateFactCheckerMessage(techCopy.slowAverageLoadIssueTemplate, {
            ms: pageWeights.avg_load_time_ms,
          }),
          raw_evidence: interpolateFactCheckerMessage(techCopy.slowAverageLoadRawEvidenceTemplate, {
            ms: pageWeights.avg_load_time_ms,
          }),
          action: 'flag',
        });
      }

      if (
        pageWeights.lazy_load_coverage < T.tech.minLazyLoadCoveragePercent &&
        result.score >= T.tech.flagMinScore
      ) {
        corrections.push({
          field: 'score',
          issue: interpolateFactCheckerMessage(techCopy.lowLazyLoadCoverageIssueTemplate, {
            pct: pageWeights.lazy_load_coverage,
          }),
          raw_evidence: interpolateFactCheckerMessage(techCopy.lowLazyLoadCoverageRawEvidenceTemplate, {
            pct: pageWeights.lazy_load_coverage,
          }),
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
    brief: BriefSnapshot = {},
    governance: BuildControlObjectGovernanceInput = {},
    /**
     * v2.2+: Phase 7 external connector enrichments (from ConnectorRunner.runAll()).
     * Pass [] or omit when no connectors ran (zero-cost — skips enrichment logic entirely).
     *
     * Effects on CONTROL_OBJECT:
     *   - Claims whose issue type matches a confirmed fact type get truth_source elevated to 'external_api'.
     *   - If all applicable connectors timed out / errored AND the phase has high-risk claims,
     *     adds 'external_source_unavailable' to human_attention_required.reasons.
     */
    connectorEnrichments: ConnectorRunResult[] = [],
    /**
     * v2.3+: Latest CONTROL_OBJECT per upstream phase (Phase 8 causal DAG).
     * Used to validate premise_refs against prior trace.claim_sources.
     */
    priorControlObjects: Partial<Record<PhaseId, ControlObjectV1>> = {},
    /** Claim indices (1-based) pre-flagged as invalidated in audit_claim_graph for this phase. */
    invalidatedIssueClaimIds: ReadonlySet<number> = new Set(),
  ): ControlObjectV1 {
    const { result, corrections, confidence: factualRaw } = factCheckResult;

    // Extended phase profile: truth profile id, error types, confidence_weights (ADR-PHASE-PROFILES)
    const profile = getExtendedPhaseProfile(domainKey);
    const truthProfileId = profile.phase_id;

    const co = createControlObjectV1(auditId, domainKey as PhaseId, executionMode, truthProfileId);

    if (governance.riskProfile !== undefined) {
      co.context.risk_profile = governance.riskProfile;
    }
    if (governance.selectedVariantId !== undefined) {
      co.context.selected_variant_id = governance.selectedVariantId;
    }

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

    const coh = FACT_CHECKER_THRESHOLDS.controlObjectHeuristics;

    // ─── Statuses ─────────────────────────────────────────────
    // Overrides = hard conflicts with evidence → likely_hallucination
    co.counts.statuses.likely_hallucination = corrections.filter(c => c.action === 'override').length;

    // Flags = suspicious but not confirmed → unverified
    co.counts.statuses.unverified = corrections.filter(c => c.action === 'flag').length;

    // Brief-sourced issues = confirmed by client context
    co.counts.statuses.confirmed_brief = issues.filter(i => i.data_source === 'from_brief').length;

    co.counts.statuses.dependent_on_brief_assumption = issues.filter(
      i => i.data_source === 'from_brief' && i.confidence === 'low',
    ).length;

    // Risky promise detection: absolute / guarantee language on recommendations
    const riskyPattern = new RegExp(
      `\\b(${coh.riskyRecommendationLanguageAlternation})\\b`,
      'i',
    );
    co.counts.statuses.risky_promise = recommendations.filter(r =>
      riskyPattern.test(r.description) || riskyPattern.test(r.impact)
    ).length;

    const unknownMax = coh.unknownItemKeyMaxChars;
    const unknownEllipsis = coh.unknownItemKeyTruncationEllipsis;

    // ─── Errors ───────────────────────────────────────────────
    // data_gaps from unknown_items
    for (const item of result.unknown_items ?? []) {
      const key =
        item.length > unknownMax
          ? item.slice(0, unknownMax - unknownEllipsis.length) + unknownEllipsis
          : item;
      co.errors.data_gaps.push(key);
    }

    // structural: score-severity mismatches (derived from corrections)
    if (corrections.some(c => c.field === 'score' && c.action === 'override')) {
      co.errors.structural.push('score_evidence_mismatch');
    }

    // v1.5: domain-specific structural errors from phase profile
    // If any correction's issue text matches a known error_type pattern, surface it
    for (const errorType of profile.error_types) {
      const keyword = errorType.replace(/_/g, ' ');
      const matchesCorrection = corrections.some(c =>
        c.issue.toLowerCase().includes(keyword) || c.raw_evidence.toLowerCase().includes(keyword)
      );
      if (matchesCorrection && !co.errors.structural.includes(errorType)) {
        co.errors.structural.push(errorType);
      }
    }

    // v2.3: upstream invalidated claims (audit_claim_graph)
    for (let invIdx = 0; invIdx < issues.length; invIdx++) {
      if (!invalidatedIssueClaimIds.has(invIdx + 1)) continue;
      if (!co.errors.structural.includes('upstream_claim_invalidated')) {
        co.errors.structural.push('upstream_claim_invalidated');
      }
      co.human_attention_required.required = true;
      if (!co.human_attention_required.reasons.includes('upstream_claim_invalidated')) {
        co.human_attention_required.reasons.push('upstream_claim_invalidated');
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

    const strategicPattern = new RegExp(coh.strategicInconsistencyStructuralCodePattern, 'i');
    co.counts.statuses.strategic_inconsistency = co.errors.structural.filter(e =>
      strategicPattern.test(e),
    ).length;

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
        const baseRisk = profile.default_assumption_risk ?? 'low';
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
    // v2.1: truth_sources[] lists contributing tiers; truth_source = priority winner
    // v2.2: merge connector tier (external_api | document_feed) when connector confirmed claim type
    const highRiskTypes = new Set(profile.high_risk_fact_types);

    const issueTitleMatchesConfirmedType = (title: string, ft: string): boolean =>
      title.toLowerCase().includes(ft.replace(/_/g, ' '));

    function externalTierForIssue(title: string): TruthSourceId | null {
      let best: TruthSourceId | null = null;
      for (const r of connectorEnrichments) {
        if (r.timed_out || r.error !== null) continue;
        const hit = r.confirmed_fact_types.some(ft => issueTitleMatchesConfirmedType(title, ft));
        if (!hit) continue;
        if (r.source_tier === 'document_feed') {
          best = 'document_feed';
          break;
        }
        if (r.source_tier === 'external_api') best = 'external_api';
      }
      return best;
    }

    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      const baseSource = mapDataSourceToTruthSource(issue.data_source ?? 'inferred');
      const tiers: TruthSourceId[] = [baseSource];
      const ext = externalTierForIssue(issue.title);
      if (ext) tiers.push(ext);
      const truthSources = normalizeTruthSourcesList(tiers);
      const truthSource = getHighestPrioritySource(truthSources);

      co.trace.claim_sources.push({
        claim_id: i + 1,
        agent: phaseNumber,
        section: `Phase ${phaseNumber} — ${domainKey}`,
        truth_source: truthSource,
        truth_sources: truthSources,
      });
    }

    co.counts.statuses.confirmed_external = co.trace.claim_sources.filter(
      cs => cs.truth_sources.includes('external_api') || cs.truth_sources.includes('document_feed'),
    ).length;

    // ─── v2.3: Causal chain (FEATURE_CAUSAL_DAG) ─────────────────
    if (isCausalDagEnabled()) {
      const chain: ControlObjectCausalChainEntry[] = [];
      const currentPhase = domainKey as PhaseId;

      for (let issueIdx = 0; issueIdx < issues.length; issueIdx++) {
        const issue = issues[issueIdx];
        const rawRefs = issue.premise_refs ?? [];
        const validRefs: ControlObjectCausalClaimRef[] = [];

        for (const raw of rawRefs) {
          if (!isKnownPhaseId(raw.phase_id)) {
            logger.warn('fact_checker.causal_unknown_phase', {
              component: 'fact_checker',
              audit_id: auditId,
              phase_id: domainKey,
              premise_phase_id: raw.phase_id,
            });
            continue;
          }
          const premisePhase = raw.phase_id;
          if (!isStrictlyBeforePhase(premisePhase, currentPhase)) {
            logger.warn('fact_checker.causal_phase_order_violation', {
              component: 'fact_checker',
              audit_id: auditId,
              phase_id: domainKey,
              premise_phase_id: premisePhase,
            });
            continue;
          }
          const prior = priorControlObjects[premisePhase];
          const sources = prior?.trace?.claim_sources ?? [];
          const maxId = sources.length > 0 ? Math.max(...sources.map(c => c.claim_id)) : 0;
          if (raw.claim_id < 1 || raw.claim_id > maxId) {
            logger.warn('fact_checker.causal_claim_out_of_range', {
              component: 'fact_checker',
              audit_id: auditId,
              phase_id: domainKey,
              premise_phase_id: premisePhase,
              claim_id: raw.claim_id,
              max_claim_id: maxId,
            });
            continue;
          }
          validRefs.push({ phase_id: premisePhase, claim_id: raw.claim_id });
        }

        const deduped = dedupeCausalRefs(validRefs);
        if (deduped.length > 0) {
          chain.push({ claim_id: issueIdx + 1, depends_on: deduped });
        }
      }

      co.trace.causal_chain = chain;
      co.versions = {
        ...co.versions,
        system_version: CONTROL_OBJECT_VERSIONS_CAUSAL_DAG.system_version,
        fact_checker_version: CONTROL_OBJECT_VERSIONS_CAUSAL_DAG.fact_checker_version,
      };
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
    const sc = coh.strategicConfidence;
    const strategic = Math.max(
      0,
      Math.round(100 - (riskyRatio * sc.riskyPromiseMultiplier) - (unverifiedRatio * sc.unverifiedMultiplier)),
    );

    // consistency: degrade if structural errors present
    const cc = coh.consistencyConfidence;
    const structuralPenalty = co.errors.structural.length * cc.structuralErrorMultiplier;
    const hallucinationPenalty = co.counts.statuses.likely_hallucination * cc.hallucinationMultiplier;
    const consistency = Math.max(0, 100 - structuralPenalty - hallucinationPenalty);

    // feasibility: score × 100
    const feasibilityScore = Math.round(feasibilityResult.score * 100);

    // overall: phase-specific weighted formula (replaces simple average from v1.5)
    const weights = profile.confidence_weights;
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
    const ha = coh.humanAttention;
    const assumptionsEscalate =
      highRiskAssumptionCount >= ha.highRiskAssumptionsGte
      || mediumRiskAssumptionCount >= ha.mediumRiskAssumptionsGte;
    // v1.7: critically low feasibility also requires human attention
    const feasibilityTooLow = feasibilityResult.score <= ha.feasibilityScoreMaxInclusive;

    if (
      co.counts.statuses.likely_hallucination >= ha.minLikelyHallucination ||
      dataGapCount >= ha.minDataGaps ||
      assumptionsEscalate ||
      feasibilityTooLow
    ) {
      co.human_attention_required.required = true;

      if (co.counts.statuses.likely_hallucination >= ha.minLikelyHallucination) {
        co.human_attention_required.reasons.push('high_hallucination_count');
      }
      if (dataGapCount >= ha.minDataGaps) {
        co.human_attention_required.reasons.push('critical_data_gaps');
      }
      if (assumptionsEscalate) {
        co.human_attention_required.reasons.push('high_risk_assumptions');
      }
      if (feasibilityTooLow) {
        co.human_attention_required.reasons.push('critically_low_feasibility');
      }
    }

    // ─── v2.2: External source unavailability flag ────────────
    // If connectors were registered and ALL applicable connectors failed/timed out,
    // AND the phase has high-risk claims, flag for human attention.
    // Condition: ≥1 connector ran, none succeeded (all timed_out or error), AND
    //            at least one issue is of a high-risk fact type.
    if (connectorEnrichments.length > 0) {
      const allConnectorsFailed = connectorEnrichments.every(r => r.timed_out || r.error !== null);
      const hasHighRiskIssue = issues.some(issue =>
        [...highRiskTypes].some(ft => issue.title.toLowerCase().includes(ft.replace(/_/g, ' ')))
      );
      if (allConnectorsFailed && hasHighRiskIssue) {
        co.human_attention_required.required = true;
        if (!co.human_attention_required.reasons.includes('external_source_unavailable')) {
          co.human_attention_required.reasons.push('external_source_unavailable');
        }
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

    // v2.3: seeds for downstream invalidation (exclude propagated upstream_claim_invalidated-only cases)
    if (isCausalDagEnabled()) {
      const structuralNative = co.errors.structural.filter(e => e !== 'upstream_claim_invalidated');
      const hasOverride = corrections.some(c => c.action === 'override');
      if (structuralNative.length > 0 && hasOverride && issues.length > 0) {
        co.context.structural_invalidation_claim_ids = issues.map((_, i) => i + 1);
      }
    }

    return co;
  }
}
