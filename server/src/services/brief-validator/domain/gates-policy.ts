import {
  buildIntakePlan,
  resolveIntakeArtifacts,
  resolvePreBriefSubmitExpressBankIds,
  type IntakeSurface,
} from '@glc/intake-core';
import { BRIEF_VALIDATION_POLICY } from '../../../config/brief-validation-policy.js';
import {
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
  type IntakeBriefCollectionMode,
  type IntakeVersionTuple,
  type ProductMode,
} from '../../../types/audit.js';
import type { BriefGateResult } from '../types.js';
import { isAnswered, isPreBriefIdSatisfied } from './answer-state.js';
import { computeProgress } from './progress-policy.js';
import { effectiveBriefForSla, getPreBriefSubmitSlotIds } from './pre-brief-slots.js';

export function evaluateBriefGates(
  responses: Record<string, unknown>,
  mode: ProductMode,
  collectionMode?: IntakeBriefCollectionMode,
  surface?: IntakeSurface,
  intakeVersionTuple?: IntakeVersionTuple,
): BriefGateResult {
  const effective = effectiveBriefForSla(responses);
  const expressPlan = buildIntakePlan({
    responses,
    productMode: 'express',
    collectionMode,
    surface,
    intakeVersionTuple,
  });
  const fullPlan = buildIntakePlan({
    responses,
    productMode: INTAKE_BRIEF_SLA_PRODUCT_MODE,
    collectionMode,
    surface,
    intakeVersionTuple,
  });

  const missingExpressRequired = expressPlan.required.filter((id) => !isAnswered(effective[id]));
  const missingFullRequired = fullPlan.required.filter((id) => !isAnswered(effective[id]));
  const expressBankSlotsForPreBriefLink =
    collectionMode === 'pre_brief'
      ? resolvePreBriefSubmitExpressBankIds(responses, collectionMode, intakeVersionTuple)
      : expressPlan.required;
  const submitSlotIds = getPreBriefSubmitSlotIds(
    effective,
    collectionMode,
    expressBankSlotsForPreBriefLink,
    intakeVersionTuple,
  );
  const missingPreBrief = submitSlotIds.filter((id) => !isPreBriefIdSatisfied(id, effective, collectionMode));
  const visibleSet = new Set(fullPlan.visible);
  const stubs = resolveIntakeArtifacts(intakeVersionTuple ?? null).stubs;
  const missingRecommended = stubs
    .filter((stub) => visibleSet.has(stub.id) && stub.priority === 'recommended')
    .map((stub) => stub.id)
    .filter((id) => !isAnswered(effective[id]));
  const intakeProgress = computeProgress(responses, collectionMode, fullPlan, surface, intakeVersionTuple);

  const minPreBriefAnswered = Math.ceil(
    submitSlotIds.length * BRIEF_VALIDATION_POLICY.preBriefSnapshotMinAnsweredRatio,
  );
  const answeredPreBrief = submitSlotIds.length - missingPreBrief.length;
  const canStartSnapshot = answeredPreBrief >= minPreBriefAnswered;
  const canStartExpress = missingExpressRequired.length === 0;
  const canStartFull = missingFullRequired.length === 0;
  const missingRequiredIds = mode === INTAKE_BRIEF_SLA_PRODUCT_MODE ? missingFullRequired : missingExpressRequired;
  const canStartPipeline = mode === INTAKE_BRIEF_SLA_PRODUCT_MODE ? canStartFull : canStartExpress;

  return {
    canStartSnapshot,
    canStartExpress,
    canStartFull,
    canStartPipeline,
    missingRequiredIds,
    recommendedToImproveIds: missingRecommended,
    intakeProgress: {
      ...intakeProgress,
      nextBestAction: missingRequiredIds.length > 0 ? 'complete_required' : intakeProgress.nextBestAction,
    },
  };
}
