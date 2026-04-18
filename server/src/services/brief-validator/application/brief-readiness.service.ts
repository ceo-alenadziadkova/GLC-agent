import {
  currentIntakeVersionTuple,
  prepareBriefForValidation,
  resolveIntakeArtifacts,
  resolveBankOptionalIds,
  syntheticIntakeVersionsBeforeMatrix,
} from '@glc/intake-core';
import { makeIncompleteBriefError } from '../../../config/brief-validation-errors.js';
import { BRIEF_VALIDATION_POLICY } from '../../../config/brief-validation-policy.js';
import {
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
  type IntakeBriefCollectionMode,
  type IntakeVersionTuple,
} from '../../../types/audit.js';
import { logger } from '../../logger.js';
import { evaluateBriefGates } from '../domain/gates-policy.js';
import { isAnswered } from '../domain/answer-state.js';
import { effectiveBriefForSla } from '../domain/pre-brief-slots.js';
import { computeOptionalStats } from '../domain/progress-policy.js';
import { coerceArtifactTupleForRead, resolveIntakeSurfaceForPlan } from '../domain/surface-policy.js';
import { validateBriefResponses } from '../domain/sla-policy.js';
import { getAuditProductMode, getIntakeBriefByAuditId, upsertIntakeBrief } from '../infra/brief-repository.js';

/**
 * Loads the brief for an audit, updates the DB stats, and returns the
 * validation result. Returns passed=true if the audit is a free_snapshot
 * (no brief required).
 *
 * Throws if paid audit brief does not meet full intake SLA.
 */
export async function assertBriefReady(auditId: string): Promise<void> {
  const productMode = await getAuditProductMode(auditId);
  if (!productMode || productMode === 'free_snapshot') return;

  const brief = await getIntakeBriefByAuditId(auditId);
  const rawBrief = (brief?.responses as Record<string, unknown>) ?? {};
  const collectionMode = brief?.collection_mode as IntakeBriefCollectionMode | undefined;
  const collectedBy = brief?.collected_by as 'client' | 'consultant' | undefined;
  const validationPerspective = collectedBy === 'consultant' ? 'consultant' : 'client';
  const effectiveCollectionMode = collectionMode ?? BRIEF_VALIDATION_POLICY.defaultCollectionMode;
  const surface = resolveIntakeSurfaceForPlan(effectiveCollectionMode, validationPerspective);
  const intakeTuple = coerceArtifactTupleForRead(
    brief?.intake_versions as IntakeVersionTuple | null | undefined,
    'assertBriefReady',
  );
  const responses = prepareBriefForValidation(rawBrief, resolveIntakeArtifacts(intakeTuple).stubs);
  const validation = validateBriefResponses(responses, {
    productMode: INTAKE_BRIEF_SLA_PRODUCT_MODE,
    collectionMode,
    surface,
    intakeVersionTuple: intakeTuple,
  });
  const gates = evaluateBriefGates(
    responses,
    INTAKE_BRIEF_SLA_PRODUCT_MODE,
    collectionMode,
    surface,
    intakeTuple,
  );
  if (brief && brief.intake_versions == null) {
    logger.debug('intake_brief missing intake_versions (pre-matrix row); validation uses current engine', {
      audit_id: auditId,
      synthetic_versions: syntheticIntakeVersionsBeforeMatrix(),
    });
  }

  const effective = effectiveBriefForSla(responses);
  const { answeredOptional, totalOptional, dataQuality } = computeOptionalStats(
    responses,
    effectiveCollectionMode,
    surface,
    intakeTuple ?? currentIntakeVersionTuple(),
  );
  const optionalIds = resolveBankOptionalIds(responses, collectionMode, surface, intakeTuple);
  const fallbackOptional = optionalIds.filter((id) => isAnswered(effective[id])).length;

  await upsertIntakeBrief(auditId, {
    responses,
    status: gates.missingRequiredIds.length === 0 ? 'submitted' : 'draft',
    sla_met: gates.missingRequiredIds.length === 0,
    answered_required: validation.answered_required,
    answered_recommended: validation.answered_recommended,
    answered_optional: Number.isFinite(answeredOptional) ? answeredOptional : fallbackOptional,
    total_required: validation.total_required,
    total_recommended: validation.total_recommended,
    total_optional: Number.isFinite(totalOptional) ? totalOptional : optionalIds.length,
    progress_pct: gates.intakeProgress.progressPct,
    readiness_badge: gates.intakeProgress.readinessBadge,
    next_best_action: gates.intakeProgress.nextBestAction,
    ...(dataQuality !== null ? { data_quality_score: dataQuality } : {}),
  });

  if (gates.missingRequiredIds.length > 0) {
    throw makeIncompleteBriefError(gates.missingRequiredIds, validation);
  }
}
