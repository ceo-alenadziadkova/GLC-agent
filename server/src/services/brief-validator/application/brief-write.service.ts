import {
  buildHypothesisCrossCheckFromReconPrefills,
  buildIntakePlan,
  currentIntakeVersionTuple,
  evaluateIntakeReadinessEnvelope,
  isSupportedIntakeArtifactTuple,
  mergeReconConflictsFromC1,
  prepareBriefForValidation,
  resolveIntakeArtifacts,
} from '@glc/intake-core';
import {
  makeInvalidBriefResponsesError,
  makeSaveBriefFailedError,
} from '../../../config/brief-validation-errors.js';
import { BRIEF_VALIDATION_POLICY } from '../../../config/brief-validation-policy.js';
import { BriefResponsesSchema } from '../../../schemas/intake-brief.js';
import {
  FREE_SNAPSHOT_PRODUCT_MODE,
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
  type IntakeBrief,
  type IntakeBriefCollectionMode,
  type IntakeVersionTuple,
  type ProductMode,
  type ReconConflict,
} from '../../../types/audit.js';
import { evaluateBriefGates } from '../domain/gates-policy.js';
import { computeOptionalStats } from '../domain/progress-policy.js';
import { resolveIntakeSurfaceForPlan } from '../domain/surface-policy.js';
import { validateBriefResponses } from '../domain/sla-policy.js';
import { getAuditProductMode, getBriefMetaByAuditId, upsertIntakeBriefReturningSingle } from '../infra/brief-repository.js';
import { logger } from '../../../services/logger.js';
import type { SaveBriefOptions, SaveBriefResult } from '../types.js';

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
    throw makeInvalidBriefResponsesError(parsed.error.message, parsed.error);
  }

  const auditMode = await getAuditProductMode(auditId);
  const mode: ProductMode =
    auditMode === FREE_SNAPSHOT_PRODUCT_MODE ? FREE_SNAPSHOT_PRODUCT_MODE : INTAKE_BRIEF_SLA_PRODUCT_MODE;
  const existingBrief = await getBriefMetaByAuditId(auditId);
  const collectionMode: IntakeBriefCollectionMode =
    options?.collection_mode
    ?? (existingBrief?.collection_mode as IntakeBriefCollectionMode | undefined)
    ?? BRIEF_VALIDATION_POLICY.defaultCollectionMode;

  const storedTuple = existingBrief?.intake_versions as IntakeVersionTuple | null | undefined;
  const effectiveTuple =
    options?.effective_intake_versions ??
    (storedTuple && isSupportedIntakeArtifactTuple(storedTuple)
      ? storedTuple
      : currentIntakeVersionTuple());
  const responses = prepareBriefForValidation(
    parsed.data as Record<string, unknown>,
    resolveIntakeArtifacts(effectiveTuple).stubs,
  ) as typeof parsed.data;

  const perspective = options?.validation_perspective ?? 'consultant';
  const surface = resolveIntakeSurfaceForPlan(collectionMode, perspective);
  const validation = validateBriefResponses(responses as Record<string, unknown>, {
    productMode: mode,
    collectionMode,
    surface,
    intakeVersionTuple: effectiveTuple,
  });
  const gates = evaluateBriefGates(responses as Record<string, unknown>, mode, collectionMode, surface, effectiveTuple);
  const intakePlan = buildIntakePlan({
    responses: responses as Record<string, unknown>,
    productMode: mode,
    collectionMode,
    surface,
    intakeVersionTuple: effectiveTuple,
  });
  const optionalStats = computeOptionalStats(
    responses as Record<string, unknown>,
    collectionMode,
    surface,
    effectiveTuple,
  );
  const prefills = (existingBrief?.recon_prefills as Record<string, unknown>) ?? {};
  const priorConflicts: ReconConflict[] = Array.isArray(existingBrief?.recon_conflicts)
    ? (existingBrief.recon_conflicts as ReconConflict[])
    : [];
  const reconConflicts = mergeReconConflictsFromC1(
    responses as Record<string, unknown>,
    prefills,
    priorConflicts,
  );

  /**
   * Recompute ADR readiness for observability. UX may save drafts while execution readiness is blocked;
   * blocking remains on `POST .../pipeline/start` when `FEATURE_DIAGNOSTIC_INTAKE_PILOT` is enabled.
   */
  const hypothesisCrossCheckByQuestionId = buildHypothesisCrossCheckFromReconPrefills(prefills);
  const intakeReadinessOnWrite = evaluateIntakeReadinessEnvelope({
    responses: responses as Record<string, unknown>,
    slaProductMode: mode,
    collectionMode,
    surface,
    intakeVersionTuple: effectiveTuple,
    enforcementPoint: 'brief_recompute',
    hypothesisCrossCheckByQuestionId,
  });
  logger.debug('brief_write.intake_readiness_recomputed', {
    auditId,
    flowReadinessStatus: intakeReadinessOnWrite.flowReadinessStatus,
    auditReadinessStatus: intakeReadinessOnWrite.auditReadinessStatus,
    trace_codes: intakeReadinessOnWrite.trace.map(t => t.code),
  });

  const { data, error } = await upsertIntakeBriefReturningSingle(auditId, {
    responses,
    status: gates.missingRequiredIds.length === 0 ? 'submitted' : 'draft',
    sla_met: gates.missingRequiredIds.length === 0,
    answered_required: validation.answered_required,
    answered_recommended: validation.answered_recommended,
    answered_optional: optionalStats.answeredOptional,
    total_required: validation.total_required,
    total_recommended: validation.total_recommended,
    total_optional: optionalStats.totalOptional,
    progress_pct: gates.intakeProgress.progressPct,
    readiness_badge: gates.intakeProgress.readinessBadge,
    next_best_action: gates.intakeProgress.nextBestAction,
    responses_format: 2,
    recon_conflicts: reconConflicts,
    collection_mode: collectionMode,
    intake_versions: intakePlan.versions,
    ...(options?.intake_version_migration
      ? { intake_version_migration: options.intake_version_migration }
      : {}),
    ...(optionalStats.dataQuality !== null ? { data_quality_score: optionalStats.dataQuality } : {}),
  });

  if (error || !data) throw makeSaveBriefFailedError(error?.message ?? 'unknown', error);
  return {
    brief: data as IntakeBrief,
    validation,
    gates,
  };
}
