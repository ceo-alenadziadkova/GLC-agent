/**
 * Decision Layer — routes phase output to accept / accept_with_warnings / refine.
 *
 * Reads CONTROL_OBJECT v1.7 and applies deterministic threshold rules.
 * Does NOT parse text output — uses only structured CONTROL_OBJECT fields.
 *
 * Phase 1 thresholds (confidence-based):
 *   accept              — overall ≥ 85 AND hallucination+risky ≤ 5% of facts
 *   accept_with_warnings — overall ≥ 70 AND no structural errors AND hallucination ≤ 3
 *   refine              — everything else
 *
 * Phase 3 additions (feasibility guardrail):
 *   - If feasibility.score ≤ FEASIBILITY_FORCE_REFINE_THRESHOLD → force 'refine' regardless of confidence
 *   - Feasibility force-refine only applies to Infra and Automation (delivery-risk domains)
 *
 * Phase 5 will activate auto-loop via AUTO_LOOP_ENABLED feature flag.
 */

import { logger } from './logger.js';
import { isNarrowGovernanceProfile } from '../lib/control-object-governance-profile.js';
import type { ControlObjectV1, DecisionHint } from '../schemas/control-object/index.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import {
  DECISION_WARNING_HUMAN_ATTENTION_FLAGGED,
  formatDecisionAcceptReasoning,
  formatDecisionAcceptWithWarningsReasoning,
  formatDecisionFeasibilityRefineReasoning,
  DECISION_NARROW_NOTES_ADVISORY_SIGNALS_DEFAULT,
  DECISION_NARROW_REASON_GOVERNANCE_INVARIANT_FAILED,
  formatDecisionNarrowAcceptReasoning,
  formatDecisionNarrowAcceptWithWarningsReasoning,
  formatDecisionNarrowRefineSummary,
  formatDecisionRefineHallucinationCount,
  formatDecisionRefineLowConfidence,
  formatDecisionRefineStructuralErrors,
  formatDecisionRefineSummary,
  formatDecisionWarningDataGaps,
  formatDecisionWarningFixable,
} from '../config/decision-layer-messages.en.js';

// ─── Thresholds (configurable for future A/B testing) ──────

export const DECISION_LAYER_THRESHOLDS = {
  accept: {
    min_overall_confidence: SYSTEM_DEFAULTS.decisionLayer.accept.minOverallConfidence,
    max_hallucination_fraction: SYSTEM_DEFAULTS.decisionLayer.accept.maxHallucinationFraction,
  },
  accept_with_warnings: {
    min_overall_confidence: SYSTEM_DEFAULTS.decisionLayer.acceptWithWarnings.minOverallConfidence,
    max_hallucination_count: SYSTEM_DEFAULTS.decisionLayer.acceptWithWarnings.maxHallucinationCount,
    max_structural_errors: SYSTEM_DEFAULTS.decisionLayer.acceptWithWarnings.maxStructuralErrors,
  },
  /**
   * v1.7: Feasibility guardrail.
   * If feasibility.score ≤ this value for a delivery-risk domain,
   * decision is forced to 'refine' regardless of confidence.
   */
  feasibility_force_refine_threshold: SYSTEM_DEFAULTS.decisionLayer.feasibilityForceRefineThreshold,
  /**
   * Domains where poor feasibility forces 'refine'.
   * These are delivery-risk domains: a great analysis is useless if the recs can't be executed.
   */
  feasibility_gated_domains: [...SYSTEM_DEFAULTS.decisionLayer.feasibilityGatedDomains] as string[],
  narrow: {
    accept: {
      min_overall_confidence: SYSTEM_DEFAULTS.decisionLayer.narrow.accept.minOverallConfidence,
    },
    accept_with_warnings: {
      min_overall_confidence: SYSTEM_DEFAULTS.decisionLayer.narrow.acceptWithWarnings.minOverallConfidence,
    },
    max_structural_errors: SYSTEM_DEFAULTS.decisionLayer.narrow.maxStructuralErrors,
    active_error_type_invariant_failed: SYSTEM_DEFAULTS.decisionLayer.narrow.activeErrorTypeInvariantFailed,
    governance_incomplete_structural_code:
      SYSTEM_DEFAULTS.strategyNarrowGovernance.errorCodes.governanceIncomplete,
  },
} as const;

// ─── Result Shape ──────────────────────────────────────────

export interface DecisionResult {
  hint: DecisionHint;
  /** Human-readable explanation for logging / consultant display */
  reasoning: string;
  /** Which error types triggered this decision (for rule engine in Phase 5) */
  active_error_types: string[];
}

// ─── Decision Layer ─────────────────────────────────────────

export class DecisionLayer {
  /**
   * Routes by `context.governance_profile`: narrow (recon/strategy Phase A) vs full (domain phases).
   */
  decideForControlObject(control: ControlObjectV1): DecisionResult {
    if (isNarrowGovernanceProfile(control)) {
      return this.decideNarrow(control);
    }
    return this.decide(control);
  }

  /**
   * Narrow profile: confidence.overall, structural errors, human_attention, data_gaps / fixable only.
   * Does not use claim buckets or feasibility.
   */
  decideNarrow(control: ControlObjectV1): DecisionResult {
    if (control.context.governance_profile !== 'narrow') {
      throw new Error('DecisionLayer.decideNarrow requires context.governance_profile === "narrow"');
    }

    const N = DECISION_LAYER_THRESHOLDS.narrow;
    const { confidence, errors } = control;
    const activeErrorTypes = [...errors.fixable, ...errors.structural, ...errors.data_gaps];

    const invariantFailed =
      typeof confidence.overall !== 'number' ||
      !Number.isFinite(confidence.overall) ||
      errors.structural.includes(N.governance_incomplete_structural_code);

    if (invariantFailed) {
      const result: DecisionResult = {
        hint: 'refine',
        reasoning: formatDecisionNarrowRefineSummary({
          reasons: DECISION_NARROW_REASON_GOVERNANCE_INVARIANT_FAILED,
        }),
        active_error_types: [...activeErrorTypes, N.active_error_type_invariant_failed],
      };
      logger.warn('decision_layer.narrow_refine_invariant', {
        component: 'decision_layer',
        audit_id: control.context.audit_id,
        phase_id: control.context.phase_id,
      });
      return result;
    }

    if (errors.structural.length > N.max_structural_errors) {
      const result: DecisionResult = {
        hint: 'refine',
        reasoning: formatDecisionNarrowRefineSummary({
          reasons: formatDecisionRefineStructuralErrors(errors.structural.join(', ')),
        }),
        active_error_types: activeErrorTypes,
      };
      logger.warn('decision_layer.narrow_refine_structural', {
        component: 'decision_layer',
        audit_id: control.context.audit_id,
        phase_id: control.context.phase_id,
        structural: errors.structural,
      });
      return result;
    }

    const ha = control.human_attention_required.required;
    const warningNotes: string[] = [];
    if (errors.data_gaps.length > 0) {
      warningNotes.push(formatDecisionWarningDataGaps(errors.data_gaps.length));
    }
    if (errors.fixable.length > 0) {
      warningNotes.push(formatDecisionWarningFixable(errors.fixable.length, errors.fixable.join(', ')));
    }
    if (ha) {
      warningNotes.push(DECISION_WARNING_HUMAN_ATTENTION_FLAGGED);
    }

    if (confidence.overall >= N.accept.min_overall_confidence && !ha && warningNotes.length === 0) {
      const result: DecisionResult = {
        hint: 'accept',
        reasoning: formatDecisionNarrowAcceptReasoning({ overall: confidence.overall }),
        active_error_types: activeErrorTypes,
      };
      logger.info('decision_layer.narrow_accept', {
        component: 'decision_layer',
        audit_id: control.context.audit_id,
        phase_id: control.context.phase_id,
        confidence: confidence.overall,
      });
      return result;
    }

    if (confidence.overall >= N.accept_with_warnings.min_overall_confidence) {
      const result: DecisionResult = {
        hint: 'accept_with_warnings',
        reasoning: formatDecisionNarrowAcceptWithWarningsReasoning({
          overall: confidence.overall,
          notes:
            warningNotes.length > 0 ? warningNotes.join('; ') : DECISION_NARROW_NOTES_ADVISORY_SIGNALS_DEFAULT,
        }),
        active_error_types: activeErrorTypes,
      };
      logger.info('decision_layer.narrow_accept_with_warnings', {
        component: 'decision_layer',
        audit_id: control.context.audit_id,
        phase_id: control.context.phase_id,
        confidence: confidence.overall,
      });
      return result;
    }

    const result: DecisionResult = {
      hint: 'refine',
      reasoning: formatDecisionNarrowRefineSummary({
        reasons: formatDecisionRefineLowConfidence(confidence.overall),
      }),
      active_error_types: activeErrorTypes,
    };
    logger.warn('decision_layer.narrow_refine_low_confidence', {
      component: 'decision_layer',
      audit_id: control.context.audit_id,
      phase_id: control.context.phase_id,
      confidence: confidence.overall,
    });
    return result;
  }

  /**
   * Evaluates a CONTROL_OBJECT v1 and returns a decision.
   *
   * Priority order:
   *   1. accept     — high confidence, low hallucination rate
   *   2. accept_with_warnings — medium confidence, fixable-only errors
   *   3. refine     — everything else
   */
  decide(control: ControlObjectV1): DecisionResult {
    const T = DECISION_LAYER_THRESHOLDS;
    const { confidence, counts, errors, context } = control;

    const hallucinationFraction = counts.fact > 0
      ? (counts.statuses.likely_hallucination + counts.statuses.risky_promise) / counts.fact
      : 0;

    const activeErrorTypes: string[] = [
      ...errors.fixable,
      ...errors.structural,
      ...errors.data_gaps,
    ];

    // ── v1.7: Feasibility Guardrail (pre-check before confidence gates) ────────
    // Delivery-risk domains force 'refine' when feasibility is critically low,
    // even if the factual confidence is high — a perfect analysis of an impossible plan is worthless.
    if (
      control.feasibility !== null &&
      T.feasibility_gated_domains.includes(context.phase_id) &&
      control.feasibility.score <= T.feasibility_force_refine_threshold
    ) {
      const result: DecisionResult = {
        hint: 'refine',
        reasoning: formatDecisionFeasibilityRefineReasoning({
          feasibilityScore: control.feasibility.score.toFixed(2),
          threshold: T.feasibility_force_refine_threshold,
          phaseId: context.phase_id,
          riskCodesJoined: control.feasibility.risk_codes.join(', '),
        }),
        active_error_types: [...activeErrorTypes, ...control.feasibility.risk_codes],
      };

      logger.warn('decision_layer.refine_feasibility', {
        component: 'decision_layer',
        audit_id: context.audit_id,
        phase_id: context.phase_id,
        feasibility_score: control.feasibility.score,
        risk_codes: control.feasibility.risk_codes,
      });

      control.decision_hint = result.hint;
      return result;
    }

    // ── Case 1: Accept ─────────────────────────────────────
    if (
      confidence.overall >= T.accept.min_overall_confidence &&
      hallucinationFraction <= T.accept.max_hallucination_fraction
    ) {
      const result: DecisionResult = {
        hint: 'accept',
        reasoning: formatDecisionAcceptReasoning({
          overall: confidence.overall,
          hallucinationPct: (hallucinationFraction * 100).toFixed(1),
        }),
        active_error_types: activeErrorTypes,
      };

      logger.info('decision_layer.accept', {
        component: 'decision_layer',
        audit_id: control.context.audit_id,
        phase_id: control.context.phase_id,
        confidence: confidence.overall,
        hallucination_fraction: hallucinationFraction,
      });

      return result;
    }

    // ── Case 2: Accept with warnings ──────────────────────
    if (
      confidence.overall >= T.accept_with_warnings.min_overall_confidence &&
      errors.structural.length <= T.accept_with_warnings.max_structural_errors &&
      counts.statuses.likely_hallucination <= T.accept_with_warnings.max_hallucination_count
    ) {
      const warningReasons: string[] = [];

      if (errors.data_gaps.length > 0) {
        warningReasons.push(formatDecisionWarningDataGaps(errors.data_gaps.length));
      }
      if (errors.fixable.length > 0) {
        warningReasons.push(formatDecisionWarningFixable(errors.fixable.length, errors.fixable.join(', ')));
      }
      if (control.human_attention_required.required) {
        warningReasons.push(DECISION_WARNING_HUMAN_ATTENTION_FLAGGED);
      }

      const result: DecisionResult = {
        hint: 'accept_with_warnings',
        reasoning: formatDecisionAcceptWithWarningsReasoning({
          overall: confidence.overall,
          issuesJoined: warningReasons.join('; '),
        }),
        active_error_types: activeErrorTypes,
      };

      logger.info('decision_layer.accept_with_warnings', {
        component: 'decision_layer',
        audit_id: control.context.audit_id,
        phase_id: control.context.phase_id,
        confidence: confidence.overall,
        warning_reasons: warningReasons,
      });

      return result;
    }

    // ── Case 3: Refine ─────────────────────────────────────
    const refineReasons: string[] = [];

    if (confidence.overall < T.accept_with_warnings.min_overall_confidence) {
      refineReasons.push(formatDecisionRefineLowConfidence(confidence.overall));
    }
    if (errors.structural.length > T.accept_with_warnings.max_structural_errors) {
      refineReasons.push(formatDecisionRefineStructuralErrors(errors.structural.join(', ')));
    }
    if (counts.statuses.likely_hallucination > T.accept_with_warnings.max_hallucination_count) {
      refineReasons.push(formatDecisionRefineHallucinationCount(counts.statuses.likely_hallucination));
    }

    const result: DecisionResult = {
      hint: 'refine',
      reasoning: formatDecisionRefineSummary(refineReasons.join('; ')),
      active_error_types: activeErrorTypes,
    };

    logger.warn('decision_layer.refine', {
      component: 'decision_layer',
      audit_id: control.context.audit_id,
      phase_id: control.context.phase_id,
      confidence: confidence.overall,
      refine_reasons: refineReasons,
      structural_errors: errors.structural,
    });

    return result;
  }
}

export const decisionLayer = new DecisionLayer();
