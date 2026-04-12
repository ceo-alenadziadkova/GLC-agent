/**
 * Decision Layer — routes phase output to accept / accept_with_warnings / refine.
 *
 * Reads CONTROL_OBJECT v1 and applies deterministic threshold rules.
 * Does NOT parse text output — uses only structured CONTROL_OBJECT fields.
 *
 * Phase 1 MVP thresholds:
 *   accept              — overall ≥ 85 AND hallucination+risky ≤ 5% of facts
 *   accept_with_warnings — overall ≥ 70 AND no structural errors AND hallucination ≤ 3
 *   refine              — everything else (in v1: escalates to manual review, no auto-loop)
 *
 * Phase 5 will activate auto-loop via AUTO_LOOP_ENABLED feature flag.
 */

import { logger } from './logger.js';
import type { ControlObjectV1, DecisionHint } from '../schemas/control-object.js';

// ─── Thresholds (configurable for future A/B testing) ──────

export const DECISION_LAYER_THRESHOLDS = {
  accept: {
    min_overall_confidence: 85,
    max_hallucination_fraction: 0.05,
  },
  accept_with_warnings: {
    min_overall_confidence: 70,
    max_hallucination_count: 3,
    max_structural_errors: 0,
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
   * Evaluates a CONTROL_OBJECT v1 and returns a decision.
   *
   * Priority order:
   *   1. accept     — high confidence, low hallucination rate
   *   2. accept_with_warnings — medium confidence, fixable-only errors
   *   3. refine     — everything else
   */
  decide(control: ControlObjectV1): DecisionResult {
    const T = DECISION_LAYER_THRESHOLDS;
    const { confidence, counts, errors } = control;

    const hallucinationFraction = counts.fact > 0
      ? (counts.statuses.likely_hallucination + counts.statuses.risky_promise) / counts.fact
      : 0;

    const activeErrorTypes: string[] = [
      ...errors.fixable,
      ...errors.structural,
      ...errors.data_gaps,
    ];

    // ── Case 1: Accept ─────────────────────────────────────
    if (
      confidence.overall >= T.accept.min_overall_confidence &&
      hallucinationFraction <= T.accept.max_hallucination_fraction
    ) {
      const result: DecisionResult = {
        hint: 'accept',
        reasoning: `Confidence ${confidence.overall}/100. Hallucination fraction ${(hallucinationFraction * 100).toFixed(1)}% — within threshold.`,
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
        warningReasons.push(`${errors.data_gaps.length} data gap(s)`);
      }
      if (errors.fixable.length > 0) {
        warningReasons.push(`${errors.fixable.length} fixable issue(s): ${errors.fixable.join(', ')}`);
      }
      if (control.human_attention_required.required) {
        warningReasons.push('human attention flagged');
      }

      const result: DecisionResult = {
        hint: 'accept_with_warnings',
        reasoning: `Confidence ${confidence.overall}/100. Issues: ${warningReasons.join('; ')}.`,
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
      refineReasons.push(`low confidence (${confidence.overall}/100)`);
    }
    if (errors.structural.length > T.accept_with_warnings.max_structural_errors) {
      refineReasons.push(`structural errors: ${errors.structural.join(', ')}`);
    }
    if (counts.statuses.likely_hallucination > T.accept_with_warnings.max_hallucination_count) {
      refineReasons.push(`hallucination count: ${counts.statuses.likely_hallucination}`);
    }

    const result: DecisionResult = {
      hint: 'refine',
      reasoning: `Refine recommended — ${refineReasons.join('; ')}.`,
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
