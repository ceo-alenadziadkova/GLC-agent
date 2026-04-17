import type { IntakePlan } from '@glc/intake-core';

export type TracePlanNodeStatus = 'required' | 'visible' | 'deferred' | 'hidden' | 'other';

export function collectPlanQuestionIds(plan: IntakePlan): string[] {
  const reasons = plan.reasonsById ?? {};
  const ids = new Set<string>([
    ...Object.keys(reasons),
    ...plan.eligible,
    ...plan.visible,
    ...plan.required,
    ...plan.hidden,
    ...plan.deferred,
  ]);
  return [...ids].sort((a, b) => a.localeCompare(b));
}

export function tracePlanNodeStatusFor(id: string, plan: IntakePlan): TracePlanNodeStatus {
  if (plan.required.includes(id)) return 'required';
  if (plan.visible.includes(id)) return 'visible';
  if (plan.deferred.includes(id)) return 'deferred';
  if (plan.hidden.includes(id)) return 'hidden';
  return 'other';
}
