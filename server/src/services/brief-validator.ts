/**
 * BriefValidator — validates intake brief completeness.
 *
 * SLA: all 🔴 required questions must be answered before Phase 0 can start.
 * If brief doesn't exist or is incomplete, startPhase(0) throws with a
 * user-friendly message listing the missing questions.
 */
import { supabase } from './supabase.js';
import {
  BRIEF_QUESTIONS,
  EXPRESS_REQUIRED_QUESTION_IDS,
  INTAKE_IDENTITY_FIELD_IDS,
  OPTIONAL_QUESTION_IDS,
  PRE_BRIEF_REQUIRED_SUBMIT_IDS,
  REQUIRED_QUESTION_IDS,
  RECOMMENDED_QUESTION_IDS,
  BriefResponsesSchema,
} from '../schemas/intake-brief.js';
import type {
  IntakeBrief,
  IntakeBriefCollectionMode,
  IntakeNextBestAction,
  IntakeReadinessBadge,
  ProductMode,
  ReconConflict,
} from '../types/audit.js';
import { deriveBankV1DataQuality } from '../intake/question-bank.js';
import { prepareBriefForValidation } from '../intake/hydrate-legacy-from-bank.js';
import { mergeReconConflictsFromC1 } from '../intake/recon-conflicts.js';

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

/** Pre-brief slot satisfied; `intake_industry_specify` only required when industry is Other. */
export function isPreBriefIdSatisfied(id: string, responses: Record<string, unknown>): boolean {
  if (id === 'intake_industry_specify') {
    const ind = unwrapAnswer(responses.intake_industry);
    if (ind !== 'Other') return true;
    return isAnswered(responses[id]);
  }
  return isAnswered(responses[id]);
}

/** Slots required for a valid public pre-brief submit (identity + express-style core). */
function getPreBriefSubmitSlotIds(responses: Record<string, unknown>): string[] {
  const ids: string[] = [
    INTAKE_IDENTITY_FIELD_IDS[0],
    INTAKE_IDENTITY_FIELD_IDS[1],
    INTAKE_IDENTITY_FIELD_IDS[2],
  ];
  if (unwrapAnswer(responses.intake_industry) === 'Other') {
    ids.push(INTAKE_IDENTITY_FIELD_IDS[3]);
  }
  ids.push(...PRE_BRIEF_REQUIRED_SUBMIT_IDS);
  return ids;
}

/** All pre-brief questions satisfied (used by public intake submit). */
export function arePreBriefSlotsSatisfied(responses: Record<string, unknown>): boolean {
  return getPreBriefSubmitSlotIds(responses).every(id => isPreBriefIdSatisfied(id, responses));
}

function computeProgress(responses: Record<string, unknown>): IntakeProgress {
  const r = prepareBriefForValidation(responses);
  const totalWeight = BRIEF_QUESTIONS.reduce((sum, q) => sum + (q.weight ?? 1), 0);
  const answeredWeight = BRIEF_QUESTIONS.reduce((sum, q) => (
    sum + (isAnswered(r[q.id]) ? (q.weight ?? 1) : 0)
  ), 0);
  const progressPct = totalWeight > 0 ? Math.min(100, Math.round((answeredWeight / totalWeight) * 100)) : 0;
  const readinessBadge: IntakeReadinessBadge = progressPct >= 80 ? 'high' : progressPct >= 45 ? 'medium' : 'low';

  const missingRequired = REQUIRED_QUESTION_IDS.filter(id => !isAnswered(r[id]));
  const missingRecommended = RECOMMENDED_QUESTION_IDS.filter(id => !isAnswered(r[id]));

  let nextBestAction: IntakeNextBestAction = 'none';
  if (missingRequired.length > 0) nextBestAction = 'complete_required';
  else if (missingRecommended.length > 0) nextBestAction = 'add_recommended';

  return { progressPct, readinessBadge, nextBestAction };
}

/**
 * Validates brief completeness without touching the DB.
 */
export function validateBriefResponses(
  responses: Record<string, unknown>
): BriefValidationResult {
  const r = prepareBriefForValidation(responses);
  const answeredRequired = REQUIRED_QUESTION_IDS.filter(id => isAnswered(r[id]));
  const answeredRecommended = RECOMMENDED_QUESTION_IDS.filter(id => isAnswered(r[id]));

  const missingRequired = REQUIRED_QUESTION_IDS
    .filter(id => !isAnswered(r[id]))
    .map(id => {
      const q = BRIEF_QUESTIONS.find(q => q.id === id)!;
      return { id, question: q.question };
    });

  const sla_met = missingRequired.length === 0;

  return {
    passed: sla_met,
    sla_met,
    answered_required: answeredRequired.length,
    total_required: REQUIRED_QUESTION_IDS.length,
    answered_recommended: answeredRecommended.length,
    total_recommended: RECOMMENDED_QUESTION_IDS.length,
    missing_required: missingRequired,
  };
}

export function evaluateBriefGates(
  responses: Record<string, unknown>,
  mode: ProductMode,
): BriefGateResult {
  const r = prepareBriefForValidation(responses);
  const missingExpressRequired = EXPRESS_REQUIRED_QUESTION_IDS.filter(id => !isAnswered(r[id]));
  const missingFullRequired = REQUIRED_QUESTION_IDS.filter(id => !isAnswered(r[id]));
  const submitSlotIds = getPreBriefSubmitSlotIds(responses);
  const missingPreBrief = submitSlotIds.filter(id => !isPreBriefIdSatisfied(id, responses));
  const missingRecommended = RECOMMENDED_QUESTION_IDS.filter(id => !isAnswered(r[id]));
  const intakeProgress = computeProgress(responses);

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
  // Check product mode — free_snapshot never needs a brief
  const { data: audit } = await supabase
    .from('audits')
    .select('product_mode')
    .eq('id', auditId)
    .single();

  if (!audit || audit.product_mode === 'free_snapshot') return;

  // Fetch brief
  const { data: brief } = await supabase
    .from('intake_brief')
    .select('*')
    .eq('audit_id', auditId)
    .single();

  const rawBrief = (brief?.responses as Record<string, unknown>) ?? {};
  const responses = prepareBriefForValidation(rawBrief);
  const validation = validateBriefResponses(rawBrief);
  const gates = evaluateBriefGates(responses, audit.product_mode as ProductMode);
  const optionalCount = OPTIONAL_QUESTION_IDS.filter(id => isAnswered(responses[id])).length;

  // Update stats in DB
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
      total_required: REQUIRED_QUESTION_IDS.length,
      total_recommended: RECOMMENDED_QUESTION_IDS.length,
      total_optional: OPTIONAL_QUESTION_IDS.length,
      progress_pct: gates.intakeProgress.progressPct,
      readiness_badge: gates.intakeProgress.readinessBadge,
      next_best_action: gates.intakeProgress.nextBestAction,
      ...(bankDataQuality !== null ? { data_quality_score: bankDataQuality } : {}),
    },
    { onConflict: 'audit_id' }
  );

  if (gates.missingRequiredIds.length > 0) {
    const questions = validation.missing_required
      .filter(q => gates.missingRequiredIds.includes(q.id))
      .map(q => `• ${q.question}`)
      .join('\n');
    throw new Error(
      `Intake brief incomplete — ${gates.missingRequiredIds.length} required question(s) unanswered:\n${questions}`
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
  const validation = validateBriefResponses(parsed.data as Record<string, unknown>);
  const { data: audit } = await supabase.from('audits').select('product_mode').eq('id', auditId).single();
  const mode = ((audit?.product_mode ?? 'full') as ProductMode);
  const gates = evaluateBriefGates(responses as Record<string, unknown>, mode);
  const answeredOptional = OPTIONAL_QUESTION_IDS.filter(id => isAnswered(responses[id])).length;
  const bankDataQualitySave = deriveBankV1DataQuality(responses as Record<string, unknown>);

  const { data: existingBrief } = await supabase
    .from('intake_brief')
    .select('recon_prefills, recon_conflicts, collection_mode')
    .eq('audit_id', auditId)
    .maybeSingle();

  const prefills = (existingBrief?.recon_prefills as Record<string, unknown>) ?? {};
  const priorConflicts: ReconConflict[] = Array.isArray(existingBrief?.recon_conflicts)
    ? (existingBrief.recon_conflicts as ReconConflict[])
    : [];
  const reconConflicts = mergeReconConflictsFromC1(
    responses as Record<string, unknown>,
    prefills,
    priorConflicts,
  );

  const collection_mode: IntakeBriefCollectionMode =
    options?.collection_mode
    ?? (existingBrief?.collection_mode as IntakeBriefCollectionMode | undefined)
    ?? 'self_serve';

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
        total_required: REQUIRED_QUESTION_IDS.length,
        total_recommended: RECOMMENDED_QUESTION_IDS.length,
        total_optional: OPTIONAL_QUESTION_IDS.length,
        progress_pct: gates.intakeProgress.progressPct,
        readiness_badge: gates.intakeProgress.readinessBadge,
        next_best_action: gates.intakeProgress.nextBestAction,
        responses_format: 2,
        recon_conflicts: reconConflicts,
        collection_mode,
        ...(bankDataQualitySave !== null ? { data_quality_score: bankDataQualitySave } : {}),
      },
      { onConflict: 'audit_id' }
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
