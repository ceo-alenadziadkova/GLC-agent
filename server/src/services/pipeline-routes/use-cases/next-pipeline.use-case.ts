import {
  executionPlanToPhases,
  maxPhaseForExecutionPlan,
  type AuditExecutionPlan,
} from '../../../types/audit.js';
import { normalizeExecutionPlanFromAuditFields } from '../../pipeline/orchestrator/execution-plan-loader.js';
import { pipelineStatusForPhase } from '../../../config/pipeline-status.js';
import { pipelineRouteErr } from '../domain/pipeline-route.errors.js';
import {
  assertNotCancelled,
  assertPipelineAccess,
  assertPipelineRole,
  assertTokenBudgetAvailable,
  isPipelinePhaseActive,
} from '../domain/pipeline-route.guards.js';
import type { PipelineNextResult } from '../domain/pipeline-route.types.js';
import { claimPipelineNext, fetchAuditForNext } from '../repository/pipeline-audit.repository.js';
import { fetchPendingReviewAfterPhase } from '../repository/pipeline-review.repository.js';

export async function runPipelineNext(params: {
  auditId: string;
  userId: string;
  role: 'consultant' | 'client' | string;
  disableAutoRemediate: boolean;
}): Promise<PipelineNextResult> {
  const { auditId, userId, role, disableAutoRemediate } = params;
  const roleErr = assertPipelineRole(role as 'consultant' | 'client');
  if (roleErr) return { ok: false, error: roleErr };

  const audit = await fetchAuditForNext(auditId, userId);
  if (!audit) return { ok: false, error: pipelineRouteErr.auditNotFound() };

  const accessErr = assertPipelineAccess(audit, userId, role as 'consultant' | 'client');
  if (accessErr) return { ok: false, error: accessErr };

  const cancelledErr = assertNotCancelled(audit.status);
  if (cancelledErr) return { ok: false, error: cancelledErr };

  const tokenErr = assertTokenBudgetAvailable(audit);
  if (tokenErr) {
    return {
      ok: false,
      error: pipelineRouteErr.tokenBudgetExceeded({
        tokens_used: audit.tokens_used,
        token_budget: audit.token_budget,
      }),
    };
  }

  if (isPipelinePhaseActive(audit.status)) return { ok: false, error: pipelineRouteErr.phaseInProgress(audit.status) };

  const plan = normalizeExecutionPlanFromAuditFields(audit as {
    execution_plan?: Partial<AuditExecutionPlan> | null;
    product_mode?: string | null;
  });
  const maxPhase = maxPhaseForExecutionPlan(plan);
  const nextPhase = executionPlanToPhases(plan)
    .filter((phase) => phase > 0)
    .find((phase) => phase > audit.current_phase);
  if (!nextPhase || nextPhase > maxPhase) return { ok: false, error: pipelineRouteErr.allPhasesComplete() };

  const pendingReview = await fetchPendingReviewAfterPhase(auditId, audit.current_phase);
  if (pendingReview) return { ok: false, error: pipelineRouteErr.reviewPending(audit.current_phase) };

  const lockStatus = pipelineStatusForPhase(nextPhase);
  const claimed = await claimPipelineNext(auditId, userId, audit.updated_at, lockStatus);
  if (!claimed) return { ok: false, error: pipelineRouteErr.nextClaimConflict() };

  return {
    ok: true,
    response: { status: 'running', phase: nextPhase },
    nextPhase,
    disableAutoRemediate,
  };
}
