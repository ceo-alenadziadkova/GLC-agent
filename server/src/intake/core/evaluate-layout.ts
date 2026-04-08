/**
 * Layout layer — presentation order and deferral. Never adds ids outside policy-visible set.
 */
import type { LayoutRulesV1 } from './layout-types.js';
import type { DebugTraceEntry, StepPlanEntry } from './types.js';

export function applyPublicDiscoveryLayout(
  policyVisibleBankOrder: string[],
  policyVisibleSet: Set<string>,
  surface: LayoutRulesV1['surfaces']['public_discovery'],
): {
  visible: string[];
  deferred: string[];
  stepPlan: StepPlanEntry[];
  debugTrace: DebugTraceEntry[];
} {
  const debugTrace: DebugTraceEntry[] = [];
  const visible: string[] = [];
  const seen = new Set<string>();

  const stepPlan: StepPlanEntry[] = surface.steps.map((step, idx) => {
    const resolved: string[] = [];
    for (const qid of step.questionIds) {
      if (!policyVisibleSet.has(qid)) {
        debugTrace.push({
          layer: 'layout',
          level: 'warn',
          code: 'LAYOUT_SKIPS_HIDDEN',
          message: `Step "${step.label ?? String(idx)}" references "${qid}" not policy-visible for this context; skipped (cannot resurrect).`,
        });
        continue;
      }
      if (seen.has(qid)) continue;
      seen.add(qid);
      resolved.push(qid);
      visible.push(qid);
    }
    return {
      stepId: `public_discovery_${idx}`,
      label: step.label,
      questionIds: resolved,
    };
  });

  const deferred = surface.deferRemaining
    ? policyVisibleBankOrder.filter(id => !seen.has(id))
    : [];

  return { visible, deferred, stepPlan, debugTrace };
}
