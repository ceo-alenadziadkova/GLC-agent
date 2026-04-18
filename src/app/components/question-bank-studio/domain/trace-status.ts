import type { IntakePlan } from '@glc/intake-core';

import type { TracePlanStatus } from '../types';

export function buildTraceStatusMap(plan: IntakePlan | null): Map<string, TracePlanStatus> {
  const map = new Map<string, TracePlanStatus>();
  if (!plan) return map;

  for (const id of plan.hidden) map.set(id, 'hidden');
  for (const id of plan.deferred) map.set(id, 'deferred');
  for (const id of plan.visible) map.set(id, 'visible');
  for (const id of plan.required) map.set(id, 'required');

  return map;
}

export function getTraceStatusForId(statusById: Map<string, TracePlanStatus>, questionId: string): TracePlanStatus {
  return statusById.get(questionId) ?? 'unknown';
}
