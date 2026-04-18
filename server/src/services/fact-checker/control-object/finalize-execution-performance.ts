import { applyExecutionMode } from '../../../config/safety-mode.js';
import { isCausalDagEnabled } from '../../../config/feature-flags.js';
import { computePerformanceMetrics } from '../../agent-performance.js';
import { STRUCTURAL_ERROR_UPSTREAM_CLAIM_INVALIDATED } from '../../../config/fact-checker/control-object-error-codes.js';
import type { ControlObjectV1 } from '../../../schemas/control-object/index.js';
import type { DomainResult } from '../../../types/audit.js';
import type { FactCorrection } from '../types.js';

export function finalizeExecutionAndPerformance(params: {
  co: ControlObjectV1;
  phaseNumber: number;
  corrections: FactCorrection[];
  issues: DomainResult['issues'];
}): void {
  const { co, phaseNumber, corrections, issues } = params;

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
    const structuralNative = co.errors.structural.filter(e => e !== STRUCTURAL_ERROR_UPSTREAM_CLAIM_INVALIDATED);
    const hasOverride = corrections.some(c => c.action === 'override');
    if (structuralNative.length > 0 && hasOverride && issues.length > 0) {
      co.context.structural_invalidation_claim_ids = issues.map((_, i) => i + 1);
    }
  }
}

