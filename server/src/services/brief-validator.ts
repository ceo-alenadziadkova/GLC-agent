/**
 * BriefValidator — validates intake brief completeness.
 *
 * SLA: required question-bank stubs (visible for branch + collection mode) plus revenue signal (bank id `a10`).
 * If brief doesn't exist or is incomplete, startPhase(0) throws with a user-friendly message.
 */
import { supabase } from './supabase.js';
import {
  BriefResponsesSchema,
  getBriefQuestionText,
  INTAKE_IDENTITY_FIELD_IDS,
} from '../schemas/intake-brief.js';
import {
  FREE_SNAPSHOT_PRODUCT_MODE,
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
  type IntakeBrief,
  type IntakeBriefCollectionMode,
  type IntakeNextBestAction,
  type IntakeReadinessBadge,
  type IntakeVersionMigration,
  type IntakeVersionTuple,
  type ProductMode,
  type ReconConflict,
} from '../types/audit.js';
import {
  buildIntakePlan,
  readinessBadgeFromProgress,
  deriveBankV1DataQuality,
  getQuestionBankPromptLabel,
  isSupportedIntakeArtifactTuple,
  resolveBankOptionalIds,
  resolvePreBriefSubmitExpressBankIds,
  resolveIntakeArtifacts,
  currentIntakeVersionTuple,
  syntheticIntakeVersionsBeforeMatrix,
  type IntakeSurface,
} from '@glc/intake-core';
import { logger } from './logger.js';
import { prepareBriefForValidation } from '@glc/intake-core';
import { mergeReconConflictsFromC1 } from '@glc/intake-core';
import { choiceValueNeedsSpecify } from '@glc/intake-core';
import { isRevenueAnsweredRaw } from '@glc/intake-core';
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
  canStartPipeline: boolean;
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
  /**
   * Which UX/layout lens to use for visible-based stats (recommended, progress weights).
   * Routes set this from audit access (consultant vs client); default consultant.
   */
  validation_perspective?: 'consultant' | 'client';
  /** Set by PUT /brief after validateIntakeVersionsForBriefWrite. */
  effective_intake_versions?: IntakeVersionTuple;
  /** When non-null, persisted to intake_version_migration on upsert. */
  intake_version_migration?: IntakeVersionMigration | null;
}

/** Owner vs linked client — drives layout surface for validation. */
export function validationPerspectiveForBriefAccess(
  auditUserId: string,
  auditClientId: string | null | undefined,
  requestUserId: string,
): 'consultant' | 'client' {
  if (auditClientId && requestUserId === auditClientId) return 'client';
  return 'consultant';
}

export function resolveIntakeSurfaceForPlan(
  collectionMode: IntakeBriefCollectionMode,
  perspective: 'consultant' | 'client',
): IntakeSurface | undefined {
  /** Matches buildIntakePlan: `public_discovery` layout only applies with this surface + discovery mode. */
  if (collectionMode === 'discovery') return 'public_discovery';
  if (perspective === 'client') {
    return collectionMode === 'pre_brief' ? 'client_portal' : 'client_form';
  }
  return 'consultant_interview';
}

/** Use stored tuple when supported; otherwise current engine (logs once per read path). */
function coerceArtifactTupleForRead(
  stored: IntakeVersionTuple | null | undefined,
  context: string,
): IntakeVersionTuple {
  const current = currentIntakeVersionTuple();
  if (!stored) return current;
  if (isSupportedIntakeArtifactTuple(stored)) return stored;
  logger.warn('intake_versions not in supported artifact registry; using current engine', {
    context,
    stored,
  });
  return current;
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

function effectiveBriefForSla(responses: Record<string, unknown>): Record<string, unknown> {
  return { ...responses };
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
  _collectionMode?: IntakeBriefCollectionMode,
): boolean {
  if (id === 'intake_industry_specify') {
    const ind = unwrapAnswer(responses.a2);
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
  expressRequiredBankIds?: string[],
  intakeVersionTuple?: IntakeVersionTuple,
): string[] {
  const ids: string[] = [...INTAKE_IDENTITY_FIELD_IDS];
  if (unwrapAnswer(responses.a2) === 'Other') {
    ids.push('intake_industry_specify');
  }
  ids.push(
    ...(expressRequiredBankIds ??
      resolvePreBriefSubmitExpressBankIds(responses, collectionMode, intakeVersionTuple)),
  );
  return ids;
}

/** All pre-brief questions satisfied (used by public intake submit). */
export function arePreBriefSlotsSatisfied(responses: Record<string, unknown>): boolean {
  const effective = effectiveBriefForSla(responses);
  return getPreBriefSubmitSlotIds(effective).every(id => isPreBriefIdSatisfied(id, effective));
}

function computeProgress(
  responses: Record<string, unknown>,
  collectionMode?: IntakeBriefCollectionMode,
  fullPlan?: ReturnType<typeof buildIntakePlan>,
  surface?: IntakeSurface,
  intakeVersionTuple?: IntakeVersionTuple,
): IntakeProgress {
  const plan =
    fullPlan ??
    buildIntakePlan({ responses, productMode: INTAKE_BRIEF_SLA_PRODUCT_MODE, collectionMode, surface, intakeVersionTuple });
  const effective = effectiveBriefForSla(responses);
  const visibleSet = new Set(plan.visible);
  const stubs = resolveIntakeArtifacts(intakeVersionTuple ?? null).stubs;
  const visible = stubs.filter(q => visibleSet.has(q.id));
  let totalWeight = 0;
  let answeredWeight = 0;
  for (const q of visible) {
    const w = q.priority === 'required' ? 3 : q.priority === 'recommended' ? 2 : 1;
    totalWeight += w;
    if (isAnswered(effective[q.id])) answeredWeight += w;
  }
  const revW = 3;
  totalWeight += revW;
  if (isRevenueAnsweredRaw(effective)) answeredWeight += revW;

  const progressPct = totalWeight > 0 ? Math.min(100, Math.round((answeredWeight / totalWeight) * 100)) : 0;
  const readinessBadge: IntakeReadinessBadge = readinessBadgeFromProgress(progressPct);

  const fullRequired = plan.required;
  const missingRequired = fullRequired.filter(id => !isAnswered(effective[id]));
  const missingRecommended = visible
    .filter(q => q.priority === 'recommended')
    .map(q => q.id)
    .filter(id => !isAnswered(effective[id]));

  let nextBestAction: IntakeNextBestAction = 'none';
  if (missingRequired.length > 0) nextBestAction = 'complete_required';
  else if (missingRecommended.length > 0) nextBestAction = 'add_recommended';

  return { progressPct, readinessBadge, nextBestAction };
}

export interface ValidateBriefOptions {
  productMode?: ProductMode;
  collectionMode?: IntakeBriefCollectionMode;
  surface?: IntakeSurface;
  intakeVersionTuple?: IntakeVersionTuple;
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
    .filter(s => visibleSet.has(s.id) && s.priority === 'recommended')
    .map(s => s.id);

  const answeredRequired = requiredIds.filter(id => isAnswered(effective[id]));
  const answeredRecommended = recIds.filter(id => isAnswered(effective[id]));

  const missingRequired = requiredIds
    .filter(id => !isAnswered(effective[id]))
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

  const missingExpressRequired = expressPlan.required.filter(id => !isAnswered(effective[id]));
  const missingFullRequired = fullPlan.required.filter(id => !isAnswered(effective[id]));
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
  const missingPreBrief = submitSlotIds.filter(id => !isPreBriefIdSatisfied(id, effective, collectionMode));
  const visibleSet = new Set(fullPlan.visible);
  const stubs = resolveIntakeArtifacts(intakeVersionTuple ?? null).stubs;
  const missingRecommended = stubs
    .filter(s => visibleSet.has(s.id) && s.priority === 'recommended')
    .map(s => s.id)
    .filter(id => !isAnswered(effective[id]));
  const intakeProgress = computeProgress(responses, collectionMode, fullPlan, surface, intakeVersionTuple);

  const minPreBriefAnswered = Math.ceil(submitSlotIds.length / 2);
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

/**
 * Loads the brief for an audit, updates the DB stats, and returns the
 * validation result. Returns passed=true if the audit is a free_snapshot
 * (no brief required).
 *
 * Throws if paid audit brief does not meet full intake SLA.
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
  const collectionMode = brief?.collection_mode as IntakeBriefCollectionMode | undefined;
  const collectedBy = brief?.collected_by as 'client' | 'consultant' | undefined;
  const validationPerspective = collectedBy === 'consultant' ? 'consultant' : 'client';
  const surface = resolveIntakeSurfaceForPlan(collectionMode ?? 'self_serve', validationPerspective);
  const mode: ProductMode = INTAKE_BRIEF_SLA_PRODUCT_MODE;
  const intakeTuple = coerceArtifactTupleForRead(
    brief?.intake_versions as IntakeVersionTuple | null | undefined,
    'assertBriefReady',
  );
  const responses = prepareBriefForValidation(
    rawBrief,
    resolveIntakeArtifacts(intakeTuple).stubs,
  );

  const validation = validateBriefResponses(responses, {
    productMode: mode,
    collectionMode,
    surface,
    intakeVersionTuple: intakeTuple,
  });
  const gates = evaluateBriefGates(responses, mode, collectionMode, surface, intakeTuple);
  if (brief && brief.intake_versions == null) {
    logger.debug('intake_brief missing intake_versions (pre-matrix row); validation uses current engine', {
      audit_id: auditId,
      synthetic_versions: syntheticIntakeVersionsBeforeMatrix(),
    });
  }
  const effectiveAssert = effectiveBriefForSla(responses);
  const optionalIds = resolveBankOptionalIds(responses, collectionMode, surface, intakeTuple);
  const optionalCount = optionalIds.filter(id => isAnswered(effectiveAssert[id])).length;

  const bankDataQuality = deriveBankV1DataQuality(effectiveAssert);

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

  const { data: audit } = await supabase
    .from('audits')
    .select('product_mode')
    .eq('id', auditId)
    .single();
  const mode: ProductMode =
    audit?.product_mode === FREE_SNAPSHOT_PRODUCT_MODE ? FREE_SNAPSHOT_PRODUCT_MODE : INTAKE_BRIEF_SLA_PRODUCT_MODE;

  const { data: existingBrief } = await supabase
    .from('intake_brief')
    .select('recon_prefills, recon_conflicts, collection_mode, intake_versions')
    .eq('audit_id', auditId)
    .maybeSingle();

  const collection_mode: IntakeBriefCollectionMode =
    options?.collection_mode
    ?? (existingBrief?.collection_mode as IntakeBriefCollectionMode | undefined)
    ?? 'self_serve';

  const storedTuple = existingBrief?.intake_versions as IntakeVersionTuple | null | undefined;
  const effectiveTuple =
    options?.effective_intake_versions ??
    (storedTuple && isSupportedIntakeArtifactTuple(storedTuple)
      ? storedTuple
      : currentIntakeVersionTuple());

  // Sanitize after effective tuple is known so frozen artifact contracts are respected.
  const responses = prepareBriefForValidation(
    parsed.data as Record<string, unknown>,
    resolveIntakeArtifacts(effectiveTuple).stubs,
  ) as typeof parsed.data;

  const perspective = options?.validation_perspective ?? 'consultant';
  const surface = resolveIntakeSurfaceForPlan(collection_mode, perspective);

  const validation = validateBriefResponses(responses as Record<string, unknown>, {
    productMode: mode,
    collectionMode: collection_mode,
    surface,
    intakeVersionTuple: effectiveTuple,
  });
  const gates = evaluateBriefGates(
    responses as Record<string, unknown>,
    mode,
    collection_mode,
    surface,
    effectiveTuple,
  );
  const intakePlan = buildIntakePlan({
    responses: responses as Record<string, unknown>,
    productMode: mode,
    collectionMode: collection_mode,
    surface,
    intakeVersionTuple: effectiveTuple,
  });
  const effectiveSave = effectiveBriefForSla(responses as Record<string, unknown>);
  const optionalIds = resolveBankOptionalIds(
    responses as Record<string, unknown>,
    collection_mode,
    surface,
    effectiveTuple,
  );
  const answeredOptional = optionalIds.filter(id => isAnswered(effectiveSave[id])).length;
  const bankDataQualitySave = deriveBankV1DataQuality(effectiveSave);

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
        intake_versions: intakePlan.versions,
        ...(options?.intake_version_migration
          ? { intake_version_migration: options.intake_version_migration }
          : {}),
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
