/**
 * Safety Mode — v1.8 execution guardrails.
 *
 * When `execution_mode = 'safe'` (from `audits.execution_mode`), additional
 * constraints are applied AFTER the standard CONTROL_OBJECT is built:
 *   - Risky promise count caps
 *   - Hallucination count caps
 *   - Unverified-fraction cap
 *   - Tone constraint scan (forbidden absolutes / unhedged claims)
 *
 * `applyExecutionMode()` mutates the CONTROL_OBJECT in-place — it only adds
 * escalation reasons; it never removes them or changes the decision_hint
 * (that remains Decision Layer's sole responsibility).
 *
 * Version history:
 *   v1.8  — Phase 4: initial safety mode guardrails
 */

import type { ControlObjectV1 } from '../schemas/control-object.js';

// ─── Guardrail Config ─────────────────────────────────────────────────────────

export const SAFETY_MODE_RULES = {
  /** In safe mode, more than this many risky_promise claims forces human review. */
  max_risky_promise_claims: 2,

  /** In safe mode, more than this many likely_hallucination claims forces human review. */
  max_likely_hallucination_claims: 2,

  /**
   * In safe mode, if unverified / total_facts exceeds this fraction, forces human review.
   * E.g. 0.25 = more than 25% of facts are unverified.
   */
  max_unverified_fraction: 0.25,

  /**
   * In safe mode, scan errors and assumption statements for absolute language.
   * Trigger words that indicate over-promise / unhedged certainty.
   */
  forbidden_absolutes_pattern:
    /\b(guarantee|guaranteed|certainly|definitely|always|never|100%|will increase|will reduce|proven to|zero risk|risk-free|fail-safe)\b/i,

  /**
   * In safe mode, scan errors for missing hypothesis markers in strategic recommendations.
   * If structural errors contain 'risky_promise_language' but no hedge keywords are found
   * in the correction issues, flag it.
   */
  require_hypothesis_label: true,
} as const;

// ─── Reason Codes ──────────────────────────────────────────────────────────────

export type SafetyViolationCode =
  | 'safe_mode_too_many_risky_promises'
  | 'safe_mode_too_many_hallucinations'
  | 'safe_mode_high_unverified_fraction'
  | 'safe_mode_forbidden_absolutes_detected'
  | 'safe_mode_missing_hypothesis_labels';

// ─── Safe Mode Applicator ──────────────────────────────────────────────────────

/**
 * Applies safe-mode guardrails to a CONTROL_OBJECT in-place.
 *
 * Only mutates `human_attention_required` and `errors.fixable` — never changes
 * `decision_hint` (Decision Layer owns that) or confidence scores.
 *
 * No-op when `execution_mode !== 'safe'`.
 */
export function applyExecutionMode(co: ControlObjectV1): void {
  if (co.context.execution_mode !== 'safe') return;

  const rules = SAFETY_MODE_RULES;
  const violations: SafetyViolationCode[] = [];

  // ── Risky promise cap ─────────────────────────────────────────────────────
  if (co.counts.statuses.risky_promise > rules.max_risky_promise_claims) {
    violations.push('safe_mode_too_many_risky_promises');
  }

  // ── Hallucination cap ─────────────────────────────────────────────────────
  if (co.counts.statuses.likely_hallucination > rules.max_likely_hallucination_claims) {
    violations.push('safe_mode_too_many_hallucinations');
  }

  // ── Unverified fraction cap ───────────────────────────────────────────────
  const unverifiedFraction =
    co.counts.fact > 0 ? co.counts.statuses.unverified / co.counts.fact : 0;
  if (unverifiedFraction > rules.max_unverified_fraction) {
    violations.push('safe_mode_high_unverified_fraction');
  }

  // ── Forbidden absolutes scan ─────────────────────────────────────────────
  // Scan fixable error labels and assumption statements for absolute language
  const textToScan = [
    ...co.errors.fixable,
    ...co.errors.structural,
    ...co.assumptions.map(a => a.statement),
  ].join(' ');

  if (rules.forbidden_absolutes_pattern.test(textToScan)) {
    violations.push('safe_mode_forbidden_absolutes_detected');
    // Surface as fixable error so the correction pass can address it
    if (!co.errors.fixable.includes('forbidden_absolutes')) {
      co.errors.fixable.push('forbidden_absolutes');
    }
  }

  // ── Missing hypothesis labels ─────────────────────────────────────────────
  if (
    rules.require_hypothesis_label &&
    co.errors.fixable.includes('risky_promise_language') &&
    co.errors.fixable.includes('score_consistency_flag')
  ) {
    // Both risky language AND unverified flags present → likely missing hedges in recs
    violations.push('safe_mode_missing_hypothesis_labels');
    if (!co.errors.fixable.includes('missing_hypothesis_labels')) {
      co.errors.fixable.push('missing_hypothesis_labels');
    }
  }

  // ── Apply to human_attention_required ─────────────────────────────────────
  if (violations.length > 0) {
    co.human_attention_required.required = true;
    for (const code of violations) {
      if (!co.human_attention_required.reasons.includes(code)) {
        co.human_attention_required.reasons.push(code);
      }
    }
    // v1.8: mark that safe-mode requirements were NOT met
    co.human_attention_required.requirements_met = false;
  } else {
    // Only set true if not already false from a non-safe-mode trigger
    if (!co.human_attention_required.required) {
      co.human_attention_required.requirements_met = true;
    }
  }
}
