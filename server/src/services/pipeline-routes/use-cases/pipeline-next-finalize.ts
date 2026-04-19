import {
  executionPlanToPhases,
  maxPhaseForExecutionPlan,
  type AuditExecutionPlan,
} from '../../../types/audit.js';
import { normalizeExecutionPlanFromAuditFields } from '../../pipeline/orchestrator/execution-plan-loader.js';
import { pipelineRouteErr } from '../domain/pipeline-route.errors.js';
import type { PipelineNextResult } from '../domain/pipeline-route.types.js';
import { claimPipelineFinalizeAfterLastGate, fetchAuditForNext, type AuditForNext } from '../repository/pipeline-audit.repository.js';
import { fetchAnyPendingReviewForAudit } from '../repository/pipeline-review.repository.js';

function completedOk(disableAutoRemediate: boolean): Extract<PipelineNextResult, { ok: true; outcome: 'completed' }> {
  return {
    ok: true,
    outcome: 'completed',
    response: { status: 'completed' },
    disableAutoRemediate,
  };
}

/**
 * When the execution plan has no further phases to run, either finalize the audit (all gates done)
 * or return the appropriate error (pending review, invalid state).
 */
export async function tryFinalizePipelineAtPlanEnd(params: {
  auditId: string;
  userId: string;
  audit: AuditForNext;
  plan: AuditExecutionPlan;
  disableAutoRemediate: boolean;
}): Promise<PipelineNextResult | null> {
  const { auditId, userId, audit, plan, disableAutoRemediate } = params;
  const maxPhase = maxPhaseForExecutionPlan(plan);
  const nextPhase = executionPlanToPhases(plan)
    .filter((phase) => phase > 0)
    .find((phase) => phase > audit.current_phase);
  if (nextPhase && nextPhase <= maxPhase) return null;

  const anyPending = await fetchAnyPendingReviewForAudit(auditId);
  if (anyPending) {
    return { ok: false, error: pipelineRouteErr.reviewPending(anyPending.after_phase) };
  }

  if (audit.status === 'completed' && audit.current_phase >= maxPhase) {
    return completedOk(disableAutoRemediate);
  }

  if (audit.status !== 'review' || audit.current_phase < maxPhase) {
    return { ok: false, error: pipelineRouteErr.allPhasesComplete() };
  }

  let claimed = await claimPipelineFinalizeAfterLastGate(auditId, userId, audit.updated_at);
  if (!claimed) {
    const fresh = await fetchAuditForNext(auditId, userId);
    if (!fresh) return { ok: false, error: pipelineRouteErr.auditNotFound() };
    const planFresh = normalizeExecutionPlanFromAuditFields(fresh as {
      execution_plan?: Partial<AuditExecutionPlan> | null;
      product_mode?: string | null;
    });
    const maxFresh = maxPhaseForExecutionPlan(planFresh);
    if (fresh.status === 'completed' && fresh.current_phase >= maxFresh) {
      return completedOk(disableAutoRemediate);
    }
    if (fresh.status !== 'review' || fresh.current_phase < maxFresh) {
      return { ok: false, error: pipelineRouteErr.nextClaimConflict() };
    }
    claimed = await claimPipelineFinalizeAfterLastGate(auditId, userId, fresh.updated_at);
  }
  if (!claimed) return { ok: false, error: pipelineRouteErr.nextClaimConflict() };
  return completedOk(disableAutoRemediate);
}
