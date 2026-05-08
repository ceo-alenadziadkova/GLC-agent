import {
  buildIntakePlan,
  currentIntakeVersionTuple,
  isIntakeMinimumContextBankId,
} from '@glc/intake-core';
import type { ProductMode, IntakeSurface, IntakeBriefCollectionMode } from '@glc/intake-core';

import { fetchBriefByAuditId } from '../../repositories/audits/audit-brief.repository.js';
import { fetchAuditForBriefById } from '../../repositories/audits/audits.repository.js';
import { getBriefQuestionsByIds } from '../../schemas/intake-brief.js';
import { buildTailoredQuestionsForResponses } from './intake-tailored-questions.service.js';
import { DEFAULT_AUDIT_PRODUCT_MODE, PRODUCT_MODES } from '../../types/audit.js';

/**
 * **Deterministic** follow-up after pre-brief: `nextRecommended` tail (non-baseline bank ids) +
 * case keys — same engine as public `GET …/tailored-questions` / two-phase UI.
 * Use as the default when LLM does not reorder (F2) or paraphrase (display-only).
 */
export function buildDeterministicIntakeFollowupBundle(raw: Record<string, unknown>) {
  return buildTailoredQuestionsForResponses(raw);
}

/**
 * Optional variant with explicit product / surface (consultant full intake, diagnostics).
 * `collectionMode` optional — when omitted, resolver uses the same defaults as a missing brief context.
 */
export function buildIntakeFollowupBundleForParams(args: {
  responses: Record<string, unknown>;
  productMode?: ProductMode;
  collectionMode?: IntakeBriefCollectionMode;
  surface?: IntakeSurface;
}): {
  questionIds: string[];
  questions: ReturnType<typeof getBriefQuestionsByIds>;
  caseKeys: string[];
  nextRecommended: string[];
} {
  const tuple = currentIntakeVersionTuple();
  const plan = buildIntakePlan({
    responses: args.responses,
    productMode: args.productMode ?? DEFAULT_AUDIT_PRODUCT_MODE,
    collectionMode: args.collectionMode,
    surface: args.surface ?? 'client_form',
    intakeVersionTuple: tuple,
  });
  const tailIds = plan.nextRecommended.filter(id => !isIntakeMinimumContextBankId(id));
  return {
    questionIds: tailIds,
    questions: getBriefQuestionsByIds(tailIds),
    caseKeys: plan.casePatternMatch?.caseKeys ?? [],
    nextRecommended: plan.nextRecommended,
  };
}

export function parseAuditProductModeForIntakeBundle(raw: string | null | undefined): ProductMode {
  if (raw && (PRODUCT_MODES as readonly string[]).includes(raw)) {
    return raw as ProductMode;
  }
  return DEFAULT_AUDIT_PRODUCT_MODE;
}

const COLLECTION_MODES: readonly IntakeBriefCollectionMode[] = [
  'self_serve',
  'interview',
  'pre_brief',
  'discovery',
] as const;

export function parseBriefCollectionModeForIntakeBundle(raw: unknown): IntakeBriefCollectionMode | undefined {
  if (typeof raw === 'string' && (COLLECTION_MODES as readonly string[]).includes(raw)) {
    return raw as IntakeBriefCollectionMode;
  }
  return undefined;
}

/**
 * Deterministic follow-up list for a linked audit: uses stored `intake_brief` + `audits.product_mode`
 * and the same non-baseline tail as public tailored-questions (ADR intake personalization).
 * Returns `null` if there is no brief row.
 */
export async function getIntakeFollowupSuggestionsForAuditId(
  auditId: string,
): Promise<{
  questionIds: string[];
  questions: ReturnType<typeof getBriefQuestionsByIds>;
  caseKeys: string[];
  nextRecommended: string[];
} | null> {
  const { data: brief, error: briefError } = await fetchBriefByAuditId(auditId);
  if (briefError || !brief) {
    return null;
  }
  const { data: audit, error: auditError } = await fetchAuditForBriefById(auditId);
  if (auditError || !audit) {
    return null;
  }
  const row = brief as {
    responses: unknown;
    collection_mode?: unknown;
    collected_by?: string;
  };
  const responses = (row.responses && typeof row.responses === 'object' && !Array.isArray(row.responses)
    ? row.responses
    : {}) as Record<string, unknown>;
  const productMode = parseAuditProductModeForIntakeBundle(audit.product_mode as string | null);
  const collectionMode = parseBriefCollectionModeForIntakeBundle(row.collection_mode);
  const surface: IntakeSurface = row.collected_by === 'client' ? 'client_form' : 'consultant_interview';
  return buildIntakeFollowupBundleForParams({
    responses,
    productMode,
    collectionMode,
    surface,
  });
}
