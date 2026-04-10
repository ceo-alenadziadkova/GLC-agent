/**
 * Question-bank SLA gates — thin wrappers over buildIntakePlan (ADR unified intake).
 * Visibility and required sets stay aligned with the resolver + policy artifact.
 */
import type { IntakeBriefCollectionMode, IntakeVersionTuple, ProductMode } from './audit-contract.js';
import { buildIntakePlan } from './core/build-intake-plan.js';
import { resolveIntakeArtifacts } from './core/resolve-intake-artifacts.js';
import type { IntakeSurface } from './core/types.js';
import type { IntakeQuestionStub } from './types.js';

function planForVisibility(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
  surface?: IntakeSurface,
  intakeVersionTuple?: IntakeVersionTuple,
) {
  return buildIntakePlan({
    responses,
    productMode: 'full',
    collectionMode,
    surface,
    intakeVersionTuple,
  });
}

export function getVisibleBankStubs(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
  surface?: IntakeSurface,
  intakeVersionTuple?: IntakeVersionTuple,
): IntakeQuestionStub[] {
  const plan = planForVisibility(responses, collectionMode, surface, intakeVersionTuple);
  const visible = new Set(plan.visible);
  const stubs = resolveIntakeArtifacts(intakeVersionTuple ?? null).stubs;
  return stubs.filter(q => visible.has(q.id));
}

export function resolveFullSlaRequiredIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
  intakeVersionTuple?: IntakeVersionTuple,
): string[] {
  return buildIntakePlan({ responses, productMode: 'full', collectionMode, intakeVersionTuple }).required;
}

export function resolveExpressSlaRequiredIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
  intakeVersionTuple?: IntakeVersionTuple,
): string[] {
  return buildIntakePlan({ responses, productMode: 'express', collectionMode, intakeVersionTuple }).required;
}

export function resolveSlaRequiredIds(
  mode: ProductMode,
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
  intakeVersionTuple?: IntakeVersionTuple,
): string[] {
  if (mode === 'free_snapshot') return [];
  if (mode === 'express') return resolveExpressSlaRequiredIds(responses, collectionMode, intakeVersionTuple);
  return resolveFullSlaRequiredIds(responses, collectionMode, intakeVersionTuple);
}

export function resolveBankRecommendedIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
  surface?: IntakeSurface,
  intakeVersionTuple?: IntakeVersionTuple,
): string[] {
  return getVisibleBankStubs(responses, collectionMode, surface, intakeVersionTuple)
    .filter(q => q.priority === 'recommended')
    .map(q => q.id);
}

export function resolveBankOptionalIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
  surface?: IntakeSurface,
  intakeVersionTuple?: IntakeVersionTuple,
): string[] {
  return getVisibleBankStubs(responses, collectionMode, surface, intakeVersionTuple)
    .filter(q => q.priority === 'optional')
    .map(q => q.id);
}
