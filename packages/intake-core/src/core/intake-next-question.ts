import type { IntakeCriticalSignalConfidence } from '../audit-contract.js';
import type { IntakePolicyIntelligenceV1 } from './policy-types.js';
import type { IntakePlan } from './types.js';

const CONF_RANK: Record<IntakeCriticalSignalConfidence, number> = {
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

function confidenceMeetsTarget(
  conf: IntakeCriticalSignalConfidence | undefined,
  target: 'low' | 'medium' | 'high',
): boolean {
  const t = CONF_RANK[target] ?? 0;
  return (CONF_RANK[conf ?? 'unknown'] ?? 0) >= t;
}

/**
 * Policy-driven check for “we can stop asking” when `nextRecommended` is empty (F1 deterministic floor — see ADR-INTAKE-NEXT-QUESTION-V1).
 */
export function evaluateMinimumSufficientContext(args: {
  plan: IntakePlan;
  policy: IntakePolicyIntelligenceV1['minimumSufficientContext'] | undefined;
}): { sufficient: boolean; reason: string } {
  const p = args.policy;
  if (!p?.enabled) {
    return { sufficient: false, reason: 'minimum_sufficient_disabled' };
  }
  const target = p.confidenceTarget ?? 'medium';

  if (p.requirePilotCriticalSatisfied && !args.plan.criticalSignals?.satisfied) {
    return { sufficient: false, reason: 'pilot_critical_unsatisfied' };
  }
  if (p.requireMatchedCaseStops && args.plan.casePatternMatch) {
    const m = args.plan.casePatternMatch;
    for (const key of m.caseKeys) {
      if (!m.stopConditionMetByCase[key]) {
        return { sufficient: false, reason: `case_stop_open:${key}` };
      }
    }
  }
  if (p.requireConfidenceFloor && args.plan.criticalSignals?.confidenceByKey) {
    for (const [k, c] of Object.entries(args.plan.criticalSignals.confidenceByKey)) {
      if (!confidenceMeetsTarget(c, target)) {
        return { sufficient: false, reason: `signal_below_target:${k}` };
      }
    }
  }
  return { sufficient: true, reason: 'minimum_sufficient_thresholds_ok' };
}

/**
 * Deterministic next-step: first `nextRecommended` id, or stop when the queue is empty and minimum-sufficient policy passes.
 * F2 LLM suggestions (future) must be validated to remain within this contract.
 */
export function decideIntakeNextQuestion(args: {
  plan: IntakePlan;
  policy: IntakePolicyIntelligenceV1['minimumSufficientContext'] | undefined;
}): {
  action: 'ask' | 'stop';
  questionId: string | null;
  reason: string;
  source: 'deterministic';
} {
  const head = args.plan.nextRecommended[0] ?? null;
  if (head) {
    return { action: 'ask', questionId: head, reason: 'next_recommended_head', source: 'deterministic' };
  }
  const m = evaluateMinimumSufficientContext(args);
  if (m.sufficient) {
    return { action: 'stop', questionId: null, reason: m.reason, source: 'deterministic' };
  }
  return { action: 'stop', questionId: null, reason: `queue_exhausted:${m.reason}`, source: 'deterministic' };
}
