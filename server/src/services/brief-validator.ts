/**
 * BriefValidator — validates intake brief completeness.
 *
 * SLA: required question-bank stubs (visible for branch + collection mode) plus revenue_model.
 * If brief doesn't exist or is incomplete, startPhase(0) throws with a user-friendly message.
 */
import { supabase } from './supabase.js';
import {
  BriefResponsesSchema,
  getBriefQuestionText,
  INTAKE_IDENTITY_FIELD_IDS,
} from '../schemas/intake-brief.js';
import type {
  IntakeBrief,
  IntakeBriefCollectionMode,
  IntakeNextBestAction,
  IntakeReadinessBadge,
  ProductMode,
  ReconConflict,
} from '../types/audit.js';
import {
  getVisibleBankStubs,
  resolveBankOptionalIds,
  resolveBankRecommendedIds,
  resolveExpressSlaRequiredIds,
  resolveFullSlaRequiredIds,
  resolveSlaRequiredIds,
} from '../intake/brief-gates.js';
import { deriveBankV1DataQuality, getQuestionBankPromptLabel } from '../intake/question-bank.js';
import { prepareBriefForValidation } from '../intake/prepare-brief-for-validation.js';
import { mergeReconConflictsFromC1 } from '../intake/recon-conflicts.js';
import { choiceValueNeedsSpecify } from '../intake/choice-specify-triggers.js';

export interface BriefValidationResult {
  passed: boolean;
  sla_met: boolean;
  answered_required: number;
  total_required: number;
  answered_recommended: number;
  total_recommended: number;
  missing_required: Array<{ id: string; question: string }>;
}

export interface IntakeProgress {
  progressPct: number;
  readinessBadge: IntakeReadinessBadge;
  nextBestAction: IntakeNextBestAction;
}

export interface BriefGateResult {
  canStartSnapshot: boolean;
  canStartExpress: boolean;
  canStartFull: boolean;
  missingRequiredIds: string[];
  recommendedToImproveIds: string[];
  intakeProgress: IntakeProgress;
}

export interface SaveBriefResult {
  brief: IntakeBrief;
  validation: BriefValidationResult;
  gates: BriefGateResult;
}

export interface SaveBriefOptions {
  collection_mode?: IntakeBriefCollectionMode;
}

function slaQuestionLabel(id: string): string {
  return getQuestionBankPromptLabel(id) ?? getBriefQuestionText(id);
}

function unwrapAnswer(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in (value as Record<string, unknown>)) {
    return (value as { value: unknown }).value;
  }
  return value;
}

function isAnswered(value: unknown): boolean {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'source' in (value as Record<string, unknown>)) {
    const src = (value as { source?: string }).source;
    if (src === 'unknown') return true;
  }
  const raw = unwrapAnswer(value);
  if (raw === null || raw === undefined) return false;
  if (typeof raw === 'string') return raw.trim().length > 0;
  if (typeof raw === 'number') return true;
  if (typeof raw === 'boolean') return true;
  if (Array.isArray(raw)) return raw.length > 0;
  return false;
}

/** Pre-brief slot satisfied; industry Other + choice options that require clarification. */
export function isPreBriefIdSatisfied(
  id: string,
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
): boolean {
  if (id === 'intake_industry_specify') {
    const ind = unwrapAnswer(responses.intake_industry);
    if (ind !== 'Other') return true;
    return isAnswered(responses[id]);
  }
  if (id === 'c3') {
    if (!isAnswered(responses.c3)) return false;
    const main = unwrapAnswer(responses.c3);
    if (choiceValueNeedsSpecify(main)) {
      return isAnswered(responses.c3__other);
    }
    return true;
  }
  return isAnswered(responses[id]);
}

function getPreBriefSubmitSlotIds(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
): string[] {
  const ids: string[] = [
    INTAKE_IDENTITY_FIELD_IDS[0],
    INTAKE_IDENTITY_FIELD_IDS[1],
    INTAKE_IDENTITY_FIELD_IDS[2],
  ];
  if (unwrapAnswer(responses.intake_industry) === 'Other') {
    ids.push(INTAKE_IDENTITY_FIELD_IDS[3]);
  }
  ids.push(...resolveExpressSlaRequiredIds(responses, collectionMode));
  return ids;
}

/** All pre-brief questions satisfied (used by public intake submit). */
export function arePreBriefSlotsSatisfied(responses: Record<string, unknown>): boolean {
  return getPreBriefSubmitSlotIds(responses).every(id =>
    isPreBriefIdSatisfied(id, responses),
  );
}

function computeProgress(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
): IntakeProgress {
  const visible = getVisibleBankStubs(responses, collectionMode);
  let totalWeight = 0;
  let answeredWeight = 0;
  for (const q of visible) {
    const w = q.priority === 'required' ? 3 : q.priority === 'recommended' ? 2 : 1;
    totalWeight += w;
    if (isAnswered(responses[q.id])) answeredWeight += w;
  }
  const revW = 3;
  totalWeight += revW;
  if (isAnswered(responses.revenue_model)) answeredWeight += revW;

  const progressPct = totalWeight > 0 ? Math.min(100, Math.round((answeredWeight / totalWeight) * 100)) : 0;
  const readinessBadge: IntakeReadinessBadge = progressPct >= 80 ? 'high' : progressPct >= 45 ? 'medium' : 'low';

  const fullRequired = resolveFullSlaRequiredIds(responses, collectionMode);
  const missingRequired = fullRequired.filter(id => !isAnswered(responses[id]));
  const missingRecommended = resolveBankRecommendedIds(responses, collectionMode).filter(
    id => !isAnswered(responses[id]),
  );

  let nextBestAction: IntakeNextBestAction = 'none';
  if (missingRequired.length > 0) nextBestAction = 'complete_required';
  else if (missingRecommended.length > 0) nextBestAction = 'add_recommended';

  return { progressPct, readinessBadge, nextBestAction };
}

export interface ValidateBriefOptions {
  productMode?: ProductMode;
  collectionMode?: IntakeBriefCollectionMode;
}

/**
 * Validates brief completeness without touching the DB.
 */
export function validateBriefResponses(
  responses: Record<string, unknown>,
  opts?: ValidateBriefOptions,
): BriefValidationResult {
  const productMode = opts?.productMode ?? 'full';
  const collectionMode = opts?.collectionMode;
  const requiredIds = resolveSlaRequiredIds(productMode, responses, collectionMode);
  const recIds = resolveBankRecommendedIds(responses, collectionMode);

  const answeredRequired = requiredIds.filter(id => isAnswered(responses[id]));
  const answeredRecommended = recIds.filter(id => isAnswered(responses[id]));

  const missingRequired = requiredIds
    .filter(id => !isAnswered(responses[id]))
    .map(id => ({ id, question: slaQuestionLabel(id) }));

  const sla_met = missingRequired.length === 0;

  return {
    passed: sla_met,
    sla_met,
    answered_required: answeredRequired.length,
    total_required: requiredIds.length,
    answered_recommended: answeredRecommended.length,
    total_recommended: recIds.length,
    missing_required: missingRequired,
  };
}

export function evaluateBriefGates(
  responses: Record<string, unknown>,
  mode: ProductMode,
  collectionMode?: IntakeBriefCollectionMode,
): BriefGateResult {
  const missingExpressRequired = resolveExpressSlaRequiredIds(responses, collectionMode).filter(
    id => !isAnswered(responses[id]),
  );
  const missingFullRequired = resolveFullSlaRequiredIds(responses, collectionMode).filter(
    id => !isAnswered(responses[id]),
  );
  const submitSlotIds = getPreBriefSubmitSlotIds(responses, collectionMode);
  const missingPreBrief = submitSlotIds.filter(id => !isPreBriefIdSatisfied(id, responses, collectionMode));
  const missingRecommended = resolveBankRecommendedIds(responses, collectionMode).filter(
    id => !isAnswered(responses[id]),
  );
  const intakeProgress = computeProgress(responses, collectionMode);

  const minPreBriefAnswered = Math.ceil(submitSlotIds.length / 2);
  const answeredPreBrief = submitSlotIds.length - missingPreBrief.length;
  const canStartSnapshot = answeredPreBrief >= minPreBriefAnswered;
  const canStartExpress = missingExpressRequired.length === 0;
  const canStartFull = missingFullRequired.length === 0;
  const missingRequiredIds = mode === 'full' ? missingFullRequired : missingExpressRequired;

  return {
    canStartSnapshot,
    canStartExpress,
    canStartFull,
    missingRequiredIds,
    recommendedToImproveIds: missingRecommended,
    intakeProgress: {
      ...intakeProgress,
      nextBestAction: missingRequiredIds.length > 0 ? 'complete_required' : intakeProgress.nextBestAction,
    },
  };
}

/**
 * Loads the brief for an audit, updates the DB stats, and returns the
 * validation result. Returns passed=true if the audit is a free_snapshot
 * (no brief required).
 *
 * Throws if product_mode is express/full and SLA is not met.
 */
export async function assertBriefReady(auditId: string): Promise<void> {
  const { data: audit } = await supabase
    .from('audits')
    .select('product_mode')
    .eq('id', auditId)
    .single();

  if (!audit || audit.product_mode === 'free_snapshot') return;

  const { data: brief } = await supabase
    .from('intake_brief')
    .select('*')
    .eq('audit_id', auditId)
    .single();

  const rawBrief = (brief?.responses as Record<string, unknown>) ?? {};
  const responses = prepareBriefForValidation(rawBrief);
  const collectionMode = brief?.collection_mode as IntakeBriefCollectionMode | undefined;
  const mode = audit.product_mode as ProductMode;

  const validation = validateBriefResponses(responses, { productMode: mode, collectionMode });
  const gates = evaluateBriefGates(responses, mode, collectionMode);
  const optionalIds = resolveBankOptionalIds(responses, collectionMode);
  const optionalCount = optionalIds.filter(id => isAnswered(responses[id])).length;

  const bankDataQuality = deriveBankV1DataQuality(responses);

  await supabase.from('intake_brief').upsert(
    {
      audit_id: auditId,
      responses,
      status: gates.missingRequiredIds.length === 0 ? 'submitted' : 'draft',
      sla_met: gates.missingRequiredIds.length === 0,
      answered_required: validation.answered_required,
      answered_recommended: validation.answered_recommended,
      answered_optional: optionalCount,
      total_required: validation.total_required,
      total_recommended: validation.total_recommended,
      total_optional: optionalIds.length,
      progress_pct: gates.intakeProgress.progressPct,
      readiness_badge: gates.intakeProgress.readinessBadge,
      next_best_action: gates.intakeProgress.nextBestAction,
      ...(bankDataQuality !== null ? { data_quality_score: bankDataQuality } : {}),
    },
    { onConflict: 'audit_id' },
  );

  if (gates.missingRequiredIds.length > 0) {
    const questions = validation.missing_required
      .filter(q => gates.missingRequiredIds.includes(q.id))
      .map(q => `• ${q.question}`)
      .join('\n');
    throw new Error(
      `Intake brief incomplete — ${gates.missingRequiredIds.length} required question(s) unanswered:\n${questions}`,
    );
  }
}

/**
 * Parses and saves brief responses for an audit.
 * Returns the saved IntakeBrief record.
 */
export async function saveBriefResponses(
  auditId: string,
  rawResponses: Record<string, unknown>,
  options?: SaveBriefOptions,
): Promise<SaveBriefResult> {
  const parsed = BriefResponsesSchema.safeParse(rawResponses);
  if (!parsed.success) {
    throw new Error(`Invalid brief responses: ${parsed.error.message}`);
  }

  const responses = prepareBriefForValidation(parsed.data as Record<string, unknown>) as typeof parsed.data;

  const { data: audit } = await supabase.from('audits').select('product_mode').eq('id', auditId).single();
  const mode = ((audit?.product_mode ?? 'full') as ProductMode);

  const { data: existingBrief } = await supabase
    .from('intake_brief')
    .select('recon_prefills, recon_conflicts, collection_mode')
    .eq('audit_id', auditId)
    .maybeSingle();

  const collection_mode: IntakeBriefCollectionMode =
    options?.collection_mode
    ?? (existingBrief?.collection_mode as IntakeBriefCollectionMode | undefined)
    ?? 'self_serve';

  const validation = validateBriefResponses(responses as Record<string, unknown>, {
    productMode: mode,
    collectionMode: collection_mode,
  });
  const gates = evaluateBriefGates(responses as Record<string, unknown>, mode, collection_mode);
  const optionalIds = resolveBankOptionalIds(responses as Record<string, unknown>, collection_mode);
  const answeredOptional = optionalIds.filter(id => isAnswered(responses[id])).length;
  const bankDataQualitySave = deriveBankV1DataQuality(responses as Record<string, unknown>);

  const prefills = (existingBrief?.recon_prefills as Record<string, unknown>) ?? {};
  const priorConflicts: ReconConflict[] = Array.isArray(existingBrief?.recon_conflicts)
    ? (existingBrief.recon_conflicts as ReconConflict[])
    : [];
  const reconConflicts = mergeReconConflictsFromC1(
    responses as Record<string, unknown>,
    prefills,
    priorConflicts,
  );

  const { data, error } = await supabase
    .from('intake_brief')
    .upsert(
      {
        audit_id: auditId,
        responses,
        status: gates.missingRequiredIds.length === 0 ? 'submitted' : 'draft',
        sla_met: gates.missingRequiredIds.length === 0,
        answered_required: validation.answered_required,
        answered_recommended: validation.answered_recommended,
        answered_optional: answeredOptional,
        total_required: validation.total_required,
        total_recommended: validation.total_recommended,
        total_optional: optionalIds.length,
        progress_pct: gates.intakeProgress.progressPct,
        readiness_badge: gates.intakeProgress.readinessBadge,
        next_best_action: gates.intakeProgress.nextBestAction,
        responses_format: 2,
        recon_conflicts: reconConflicts,
        collection_mode,
        ...(bankDataQualitySave !== null ? { data_quality_score: bankDataQualitySave } : {}),
      },
      { onConflict: 'audit_id' },
    )
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to save brief: ${error?.message ?? 'unknown'}`);

  return {
    brief: data as IntakeBrief,
    validation,
    gates,
  };
}
