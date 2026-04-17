import {
  buildIntakePlan,
  getQuestionBankPromptLabel,
  resolveIntakeArtifacts,
  type IntakeSurface,
} from '@glc/intake-core';
import { getBriefQuestionText } from '../../../schemas/intake-brief.js';
import {
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
  type IntakeBriefCollectionMode,
  type IntakeVersionTuple,
  type ProductMode,
} from '../../../types/audit.js';
import type { BriefValidationResult } from '../types.js';
import { isAnswered } from './answer-state.js';
import { effectiveBriefForSla } from './pre-brief-slots.js';

export interface ValidateBriefOptions {
  productMode?: ProductMode;
  collectionMode?: IntakeBriefCollectionMode;
  surface?: IntakeSurface;
  intakeVersionTuple?: IntakeVersionTuple;
}

function slaQuestionLabel(id: string): string {
  return getQuestionBankPromptLabel(id) ?? getBriefQuestionText(id);
}

/**
 * Validates brief completeness without touching the DB.
 */
export function validateBriefResponses(
  responses: Record<string, unknown>,
  opts?: ValidateBriefOptions,
): BriefValidationResult {
  const productMode = opts?.productMode ?? INTAKE_BRIEF_SLA_PRODUCT_MODE;
  const collectionMode = opts?.collectionMode;
  const surface = opts?.surface;
  const intakeVersionTuple = opts?.intakeVersionTuple;
  const plan = buildIntakePlan({ responses, productMode, collectionMode, surface, intakeVersionTuple });
  const effective = effectiveBriefForSla(responses);
  const requiredIds = productMode === 'free_snapshot' ? [] : plan.required;
  const visibleSet = new Set(plan.visible);
  const stubs = resolveIntakeArtifacts(intakeVersionTuple ?? null).stubs;
  const recIds = stubs
    .filter((stub) => visibleSet.has(stub.id) && stub.priority === 'recommended')
    .map((stub) => stub.id);

  const answeredRequired = requiredIds.filter((id) => isAnswered(effective[id]));
  const answeredRecommended = recIds.filter((id) => isAnswered(effective[id]));
  const missingRequired = requiredIds
    .filter((id) => !isAnswered(effective[id]))
    .map((id) => ({ id, question: slaQuestionLabel(id) }));
  const slaMet = missingRequired.length === 0;

  return {
    passed: slaMet,
    sla_met: slaMet,
    answered_required: answeredRequired.length,
    total_required: requiredIds.length,
    answered_recommended: answeredRecommended.length,
    total_recommended: recIds.length,
    missing_required: missingRequired,
  };
}
