import type { IntakePlan, QuestionReason } from '@glc/intake-core';
import { collectPlanQuestionIds } from '../domain/trace-plan-selectors';

export function buildPlanSets(plan: IntakePlan) {
  return {
    eligible: new Set(plan.eligible),
    visible: new Set(plan.visible),
    required: new Set(plan.required),
    hidden: new Set(plan.hidden),
    deferred: new Set(plan.deferred),
    sla: new Set(plan.slaVisibleBankIds),
  };
}

export function selectSortedQuestionIds(plan: IntakePlan): string[] {
  return collectPlanQuestionIds(plan);
}

export function selectFilteredQuestionIds(params: {
  sortedIds: string[];
  reasonsById: IntakePlan['reasonsById'];
  query: string;
  layerFilter: Set<QuestionReason['layer']>;
  stateFilter: Set<QuestionReason['state']>;
}): string[] {
  const { sortedIds, reasonsById, query, layerFilter, stateFilter } = params;
  const normalizedQuery = query.trim().toLowerCase();
  const reasons = reasonsById ?? {};
  return sortedIds.filter(id => {
    if (normalizedQuery && !id.toLowerCase().includes(normalizedQuery)) return false;
    const entries = reasons[id];
    if (!entries?.length) return normalizedQuery.length === 0;
    const layerMatches = entries.some(reason => layerFilter.has(reason.layer));
    if (!layerMatches) return false;
    if (stateFilter.size > 0) {
      return entries.some(reason => stateFilter.has(reason.state));
    }
    return true;
  });
}

export function selectDebugTrace(plan: IntakePlan, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const entries = plan.debugTrace ?? [];
  if (!normalizedQuery) return entries;
  return entries.filter(
    entry =>
      entry.code.toLowerCase().includes(normalizedQuery) ||
      entry.message.toLowerCase().includes(normalizedQuery) ||
      entry.layer.toLowerCase().includes(normalizedQuery),
  );
}

export function toggleValueInSet<T>(set: Set<T>, value: T, nextEnabled: boolean): Set<T> {
  const next = new Set(set);
  if (nextEnabled) next.add(value);
  else next.delete(value);
  return next;
}
