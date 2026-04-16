/**
 * Question-bank SLA gates — thin wrappers over buildIntakePlan (ADR unified intake).
 * Visibility and required sets stay aligned with the resolver + policy artifact.
 */
import type { IntakeBriefCollectionMode, IntakeVersionTuple, ProductMode } from './audit-contract.js';
import { buildIntakePlan } from './core/build-intake-plan.js';
import { resolveIntakeArtifacts } from './core/resolve-intake-artifacts.js';
import type { IntakeSurface } from './core/types.js';
import { INTAKE_IDENTITY_FIELD_IDS, PRE_BRIEF_PARTICIPATION_IDS } from './intake-brief-catalog-meta.js';
import type { IntakeQuestionStub } from './types.js';
import { choiceValueNeedsSpecify } from './choice-specify-triggers.js';
import { unwrapIntakeValue } from './unwrap.js';

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

/**
 * Express SLA bank ids that count toward **public pre-brief** submit (link flow).
 * Omits `requiredIfVisible` questions not listed in `modes.pre_brief.bankIncluded`, so slots stay aligned with UI.
 */
export function resolvePreBriefSubmitExpressBankIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
  intakeVersionTuple?: IntakeVersionTuple,
): string[] {
  return resolveExpressSlaRequiredIds(responses, collectionMode, intakeVersionTuple).filter(id =>
    PRE_BRIEF_PARTICIPATION_IDS.has(id),
  );
}

function isPreBriefAnswered(value: unknown): boolean {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'source' in (value as Record<string, unknown>)) {
    const src = (value as { source?: string }).source;
    if (src === 'unknown') return true;
  }
  const raw = unwrapIntakeValue(value);
  if (raw == null) return false;
  if (typeof raw === 'string') return raw.trim().length > 0;
  if (typeof raw === 'number') return true;
  if (typeof raw === 'boolean') return true;
  if (Array.isArray(raw)) return raw.length > 0;
  return false;
}

export function isPreBriefSubmitSlotSatisfied(id: string, responses: Record<string, unknown>): boolean {
  if (id === 'intake_industry_specify') {
    const industry = unwrapIntakeValue(responses.a2);
    if (industry !== 'Other') return true;
    return isPreBriefAnswered(responses[id]);
  }

  if (id === 'c3') {
    if (!isPreBriefAnswered(responses.c3)) return false;
    if (choiceValueNeedsSpecify(unwrapIntakeValue(responses.c3))) {
      return isPreBriefAnswered(responses.c3__other);
    }
    return true;
  }

  return isPreBriefAnswered(responses[id]);
}

export function getPreBriefSubmitSlotIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
  intakeVersionTuple?: IntakeVersionTuple,
): string[] {
  const ids: string[] = [...INTAKE_IDENTITY_FIELD_IDS];
  if (unwrapIntakeValue(responses.a2) === 'Other') {
    ids.push('intake_industry_specify');
  }
  ids.push(...resolvePreBriefSubmitExpressBankIds(responses, collectionMode, intakeVersionTuple));
  return ids;
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
