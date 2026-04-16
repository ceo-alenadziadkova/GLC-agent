import { FACT_CHECKER_THRESHOLDS } from '../../../config/fact-checker-thresholds.js';
import type { ControlObjectV1 } from '../../../schemas/control-object.js';
import type { DomainResult } from '../../../types/audit.js';
import type { FactCorrection } from '../types.js';

export function buildCountsAndStatuses(params: {
  co: ControlObjectV1;
  result: DomainResult;
  corrections: FactCorrection[];
}): void {
  const { co, result, corrections } = params;

  // ─── Counts ────────────────────────────────────────────────
  const issues = result.issues ?? [];
  const recommendations = result.recommendations ?? [];
  const strengthsCount = (result.strengths ?? []).length;
  const weaknessesCount = (result.weaknesses ?? []).length;

  const factCount = issues.length; // issues = verifiable claims
  const hypothesisCount = recommendations.length; // recs are strategic bets
  const opinionCount = strengthsCount + weaknessesCount; // s/w = qualitative views

  co.counts.fact = factCount;
  co.counts.strategic_hypothesis = hypothesisCount;
  co.counts.opinion = opinionCount;
  co.counts.total_claims = factCount + hypothesisCount + opinionCount;

  const coh = FACT_CHECKER_THRESHOLDS.controlObjectHeuristics;

  // ─── Statuses ──────────────────────────────────────────────
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
  const riskyPattern = new RegExp(`\\b(${coh.riskyRecommendationLanguageAlternation})\\b`, 'i');
  co.counts.statuses.risky_promise = recommendations.filter(r => riskyPattern.test(r.description) || riskyPattern.test(r.impact)).length;
}

