import {
  buildIntakePlan,
  deriveBankV1DataQuality,
  isRevenueAnsweredRaw,
  readinessBadgeFromProgress,
  resolveIntakeArtifacts,
  resolveBankOptionalIds,
  type IntakeSurface,
} from '@glc/intake-core';
import { BRIEF_VALIDATION_POLICY } from '../../../config/brief-validation-policy.js';
import type {
  IntakeBriefCollectionMode,
  IntakeNextBestAction,
  IntakeVersionTuple,
} from '../../../types/audit.js';
import { INTAKE_BRIEF_SLA_PRODUCT_MODE } from '../../../types/audit.js';
import type { IntakeProgress } from '../types.js';
import { isAnswered } from './answer-state.js';
import { effectiveBriefForSla } from './pre-brief-slots.js';

export function computeProgress(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
  fullPlan?: ReturnType<typeof buildIntakePlan>,
  surface?: IntakeSurface,
  intakeVersionTuple?: IntakeVersionTuple,
): IntakeProgress {
  const plan =
    fullPlan ??
    buildIntakePlan({
      responses,
      productMode: INTAKE_BRIEF_SLA_PRODUCT_MODE,
      collectionMode,
      surface,
      intakeVersionTuple,
    });
  const effective = effectiveBriefForSla(responses);
  const visibleSet = new Set(plan.visible);
  const stubs = resolveIntakeArtifacts(intakeVersionTuple ?? null).stubs;
  const visible = stubs.filter((item) => visibleSet.has(item.id));
  const weights = BRIEF_VALIDATION_POLICY.progressWeights;
  let totalWeight = 0;
  let answeredWeight = 0;
  for (const question of visible) {
    const weight =
      question.priority === 'required'
        ? weights.required
        : question.priority === 'recommended'
          ? weights.recommended
          : weights.optional;
    totalWeight += weight;
    if (isAnswered(effective[question.id])) answeredWeight += weight;
  }
  totalWeight += weights.revenueSignal;
  if (isRevenueAnsweredRaw(effective)) answeredWeight += weights.revenueSignal;

  const progressPct = totalWeight > 0 ? Math.min(100, Math.round((answeredWeight / totalWeight) * 100)) : 0;
  const readinessBadge = readinessBadgeFromProgress(progressPct);

  const fullRequired = plan.required;
  const missingRequired = fullRequired.filter((id) => !isAnswered(effective[id]));
  const missingRecommended = visible
    .filter((item) => item.priority === 'recommended')
    .map((item) => item.id)
    .filter((id) => !isAnswered(effective[id]));

  let nextBestAction: IntakeNextBestAction = 'none';
  if (missingRequired.length > 0) nextBestAction = 'complete_required';
  else if (missingRecommended.length > 0) nextBestAction = 'add_recommended';

  return { progressPct, readinessBadge, nextBestAction };
}

export function computeOptionalStats(
  responses: Record<string, unknown>,
  collectionMode: IntakeBriefCollectionMode,
  surface: IntakeSurface | undefined,
  intakeVersionTuple: IntakeVersionTuple,
): { answeredOptional: number; totalOptional: number; dataQuality: number | null } {
  const effective = effectiveBriefForSla(responses);
  const optionalIds = resolveBankOptionalIds(responses, collectionMode, surface, intakeVersionTuple);
  const answeredOptional = optionalIds.filter((id) => isAnswered(effective[id])).length;
  const dataQuality = deriveBankV1DataQuality(effective);
  return { answeredOptional, totalOptional: optionalIds.length, dataQuality };
}
