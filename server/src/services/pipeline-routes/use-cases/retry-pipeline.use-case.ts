import {
  DEFAULT_AUDIT_COVERAGE_PACKAGE,
  executionPlanToPhases,
  type AuditExecutionPlan,
} from '../../../types/audit.js';
import { pipelineStatusForPhase } from '../../../config/pipeline-status.js';
import { pipelinePhaseNotAvailableMessage } from '../../../config/api-error-codes.js';
import { PIPELINE_RETRY_CLAIM_OWNERSHIP } from '../../../config/pipeline-retry-claim.js';
import { canManagePlatformSettings } from '../../../lib/platform-admin.js';
import { normalizeExecutionPlanFromAuditFields } from '../../pipeline/orchestrator/execution-plan-loader.js';
import { pipelineRouteErr } from '../domain/pipeline-route.errors.js';
import { assertNotCancelled, assertTokenBudgetAvailable, isPipelinePhaseActive } from '../domain/pipeline-route.guards.js';
import type { PipelineRetryResult } from '../domain/pipeline-route.types.js';
import { claimPipelineRetry, fetchAuditForRetryById } from '../repository/pipeline-audit.repository.js';

export async function runPipelineRetry(params: {
  auditId: string;
  userId: string;
  phase: number;
  disableAutoRemediate: boolean;
}): Promise<PipelineRetryResult> {
  const { auditId, userId, phase, disableAutoRemediate } = params;
  const audit = await fetchAuditForRetryById(auditId);
  if (!audit) return { ok: false, error: pipelineRouteErr.auditNotFound() };

  const isOwner = audit.user_id === userId;
  const mayOperateAsPlatform = !isOwner && (await canManagePlatformSettings(userId));
  if (!isOwner && !mayOperateAsPlatform) return { ok: false, error: pipelineRouteErr.auditNotFound() };

  const cancelledErr = assertNotCancelled(audit.status);
  if (cancelledErr) return { ok: false, error: cancelledErr };

  const tokenErr = assertTokenBudgetAvailable(audit);
  if (tokenErr) return { ok: false, error: tokenErr };

  const retryPlan = normalizeExecutionPlanFromAuditFields(audit as {
    execution_plan?: Partial<AuditExecutionPlan> | null;
    product_mode?: string | null;
  });
  if (!executionPlanToPhases(retryPlan).includes(phase)) {
    return {
      ok: false,
      error: pipelineRouteErr.phaseNotAvailableForMode(
        pipelinePhaseNotAvailableMessage(phase, retryPlan.coverage_package ?? DEFAULT_AUDIT_COVERAGE_PACKAGE),
      ),
    };
  }

  if (isPipelinePhaseActive(audit.status)) return { ok: false, error: pipelineRouteErr.phaseInProgress(audit.status) };

  const lockStatus = pipelineStatusForPhase(phase);
  const retryOwnership = isOwner
    ? ({ kind: PIPELINE_RETRY_CLAIM_OWNERSHIP.owner, actorUserId: userId })
    : ({ kind: PIPELINE_RETRY_CLAIM_OWNERSHIP.platformOperator });
  const claimed = await claimPipelineRetry(auditId, audit.updated_at, lockStatus, retryOwnership);
  if (!claimed) return { ok: false, error: pipelineRouteErr.retryClaimConflict() };

  return { ok: true, response: { status: 'retrying', phase }, disableAutoRemediate };
}
