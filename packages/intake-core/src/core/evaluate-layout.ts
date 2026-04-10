/**
 * Layout layer — presentation order and deferral. Never adds ids outside policy-visible set.
 */
import type { LayoutSurfaceV1 } from './layout-types.js';
import type { DebugTraceEntry, StepPlanEntry } from './types.js';

export interface SurfaceLayoutResult {
  visible: string[];
  deferred: string[];
  stepPlan: StepPlanEntry[];
  debugTrace: DebugTraceEntry[];
  /** Policy-visible bank ids omitted because of `suppressQuestionIds` (not placed in visible/deferred). */
  suppressedEligibleIds: string[];
}

export function applySurfaceLayout(
  policyVisibleBankOrder: string[],
  policyVisibleSet: Set<string>,
  surface: LayoutSurfaceV1,
  stepIdPrefix: string,
): SurfaceLayoutResult {
  const debugTrace: DebugTraceEntry[] = [];
  const visible: string[] = [];
  const seen = new Set<string>();
  const suppressed = new Set(surface.suppressQuestionIds ?? []);

  const stepPlan: StepPlanEntry[] = surface.steps.map((step, idx) => {
    const resolved: string[] = [];
    for (const qid of step.questionIds) {
      if (suppressed.has(qid)) {
        debugTrace.push({
          layer: 'layout',
          level: 'info',
          code: 'LAYOUT_SKIPS_SUPPRESSED',
          message: `Step "${step.label ?? String(idx)}" references "${qid}" suppressed on this surface; skipped.`,
        });
        continue;
      }
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
      stepId: `${stepIdPrefix}${idx}`,
      label: step.label,
      questionIds: resolved,
    };
  });

  const suppressedEligibleIds: string[] = [];
  for (const id of policyVisibleBankOrder) {
    if (!policyVisibleSet.has(id)) continue;
    if (!suppressed.has(id)) continue;
    if (!seen.has(id)) suppressedEligibleIds.push(id);
  }

  if (surface.deferRemaining) {
    const deferred = policyVisibleBankOrder.filter(
      id => policyVisibleSet.has(id) && !seen.has(id) && !suppressed.has(id),
    );
    return { visible, deferred, stepPlan, debugTrace, suppressedEligibleIds };
  }

  for (const id of policyVisibleBankOrder) {
    if (!policyVisibleSet.has(id) || seen.has(id) || suppressed.has(id)) continue;
    seen.add(id);
    visible.push(id);
  }

  return { visible, deferred: [], stepPlan, debugTrace, suppressedEligibleIds };
}

/** @deprecated Use applySurfaceLayout — kept for call sites that import by name. */
export function applyPublicDiscoveryLayout(
  policyVisibleBankOrder: string[],
  policyVisibleSet: Set<string>,
  surface: LayoutSurfaceV1,
): SurfaceLayoutResult {
  return applySurfaceLayout(policyVisibleBankOrder, policyVisibleSet, surface, 'public_discovery_');
}
