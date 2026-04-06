/**
 * Question-bank SLA gates — required/recommended sets from visible stubs + revenue_model.
 * No legacy key hydration or merge (see docs/QUESTION_BANK.md).
 */
import type { IntakeBriefCollectionMode, ProductMode } from '../types/audit.js';
import { filterVisibleQuestions, type IntakeVisibilityContext } from './is-visible.js';
import { QUESTION_BANK_V1_STUBS } from './question-bank.js';
import type { IntakeQuestionStub, IntakeResponsesMap } from './types.js';

/** Bank visibility uses engine `CollectionMode` (standard | discovery); DB `pre_brief` / `interview` do not narrow stubs. */
function visibilityCtx(collectionMode?: IntakeBriefCollectionMode): IntakeVisibilityContext | undefined {
  if (collectionMode === 'discovery') return { collectionMode: 'discovery' };
  return undefined;
}

export function getVisibleBankStubs(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
): IntakeQuestionStub[] {
  return filterVisibleQuestions(
    QUESTION_BANK_V1_STUBS,
    responses as IntakeResponsesMap,
    visibilityCtx(collectionMode),
  );
}

/** Full audit: every visible bank required stub + revenue_model (not in bank JSON). */
export function resolveFullSlaRequiredIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
): string[] {
  const visible = getVisibleBankStubs(responses, collectionMode);
  const bank = visible.filter(q => q.priority === 'required').map(q => q.id);
  return [...new Set([...bank, 'revenue_model'])];
}

const EXPRESS_ALWAYS = ['f1', 'b1', 'revenue_model', 'a6'] as const;
const EXPRESS_WEBSITE_ONLY = ['c5', 'c3'] as const;

/**
 * Express audit: core business + payments + analytics/CTA only when website path is visible.
 */
export function resolveExpressSlaRequiredIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
): string[] {
  const visibleIds = new Set(getVisibleBankStubs(responses, collectionMode).map(q => q.id));
  const out: string[] = [...EXPRESS_ALWAYS];
  for (const id of EXPRESS_WEBSITE_ONLY) {
    if (visibleIds.has(id)) out.push(id);
  }
  return out;
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

