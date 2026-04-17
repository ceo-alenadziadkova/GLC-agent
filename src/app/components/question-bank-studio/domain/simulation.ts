import type { IntakePlan, QuestionReason } from '@glc/intake-core';
import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';

import {
  computeBranchDownstreamIds,
  computeBranchUpstreamIds,
} from '../../intake/intake-trace-branch-links';

export type UserStepSimulation = {
  nextIds: string[];
  addedNext: string[];
  removedNext: string[];
  nowVisible: string[];
};

export function buildUserStepSimulation(selectedQuestionId: string | null, tracePlan: IntakePlan | null): UserStepSimulation {
  if (!selectedQuestionId) {
    return { nextIds: [], addedNext: [], removedNext: [], nowVisible: [] };
  }
  const nextIds = computeBranchDownstreamIds(selectedQuestionId, QUESTION_BANK_V1_STUBS);
  if (!tracePlan) {
    return { nextIds, addedNext: [], removedNext: [], nowVisible: [] };
  }
  const nowVisibleSet = new Set([...tracePlan.required, ...tracePlan.visible]);
  const nowVisible = [...nowVisibleSet].sort((a, b) => a.localeCompare(b));
  const addedNext = nextIds.filter(id => tracePlan.required.includes(id) || tracePlan.visible.includes(id));
  const removedNext = nextIds.filter(id => tracePlan.hidden.includes(id) || tracePlan.deferred.includes(id));
  return { nextIds, addedNext, removedNext, nowVisible };
}

export function buildSelectedQuestionWhy(
  selectedQuestionId: string | null,
  tracePlan: IntakePlan | null,
): QuestionReason[] {
  if (!selectedQuestionId || !tracePlan) return [];
  return tracePlan.reasonsById?.[selectedQuestionId] ?? [];
}

export function buildBreadcrumbQuestionIds(selectedQuestionId: string | null): string[] {
  if (!selectedQuestionId) return [];
  const upstream = computeBranchUpstreamIds(selectedQuestionId, QUESTION_BANK_V1_STUBS);
  return [...upstream, selectedQuestionId];
}

export function buildSelectedQuestionDependencies(selectedQuestionId: string | null): {
  dependsOn: string[];
  enables: string[];
} {
  if (!selectedQuestionId) return { dependsOn: [], enables: [] };
  return {
    dependsOn: computeBranchUpstreamIds(selectedQuestionId, QUESTION_BANK_V1_STUBS),
    enables: computeBranchDownstreamIds(selectedQuestionId, QUESTION_BANK_V1_STUBS),
  };
}
