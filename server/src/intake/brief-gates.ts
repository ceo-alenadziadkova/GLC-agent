/**
 * Question-bank SLA gates — thin wrappers over buildIntakePlan (ADR unified intake).
 * Visibility and required sets stay aligned with the resolver + policy artifact.
 */
import type { IntakeBriefCollectionMode, ProductMode } from '../types/audit.js';
import { buildIntakePlan } from './core/build-intake-plan.js';
import { QUESTION_BANK_V1_STUBS } from './question-bank.js';
import type { IntakeQuestionStub } from './types.js';

function planForVisibility(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
) {
  return buildIntakePlan({
    responses,
    productMode: 'full',
    collectionMode,
  });
}

export function getVisibleBankStubs(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
): IntakeQuestionStub[] {
  const visible = new Set(planForVisibility(responses, collectionMode).visible);
  return QUESTION_BANK_V1_STUBS.filter(q => visible.has(q.id));
}

export function resolveFullSlaRequiredIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
): string[] {
  return buildIntakePlan({ responses, productMode: 'full', collectionMode }).required;
}

export function resolveExpressSlaRequiredIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
): string[] {
  return buildIntakePlan({ responses, productMode: 'express', collectionMode }).required;
}

export function resolveSlaRequiredIds(
  mode: ProductMode,
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
): string[] {
  if (mode === 'free_snapshot') return [];
  if (mode === 'express') return resolveExpressSlaRequiredIds(responses, collectionMode);
  return resolveFullSlaRequiredIds(responses, collectionMode);
}

export function resolveBankRecommendedIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
): string[] {
  return getVisibleBankStubs(responses, collectionMode)
    .filter(q => q.priority === 'recommended')
    .map(q => q.id);
}

export function resolveBankOptionalIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
): string[] {
  return getVisibleBankStubs(responses, collectionMode)
    .filter(q => q.priority === 'optional')
    .map(q => q.id);
}
