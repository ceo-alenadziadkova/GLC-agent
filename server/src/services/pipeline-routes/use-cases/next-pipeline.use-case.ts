import {
  executionPlanToPhases,
  maxPhaseForExecutionPlan,
  type AuditExecutionPlan,
} from '../../../types/audit.js';
import { intakeBriefGateModeFromExecutionPlan } from '../../../lib/audit-coverage-bridge.js';
import { normalizeExecutionPlanFromAuditFields } from '../../pipeline/orchestrator/execution-plan-loader.js';
import {
  resolveIntakeSurfaceForPlan,
  validationPerspectiveForBriefAccess,
} from '../../brief-validator.js';
import { pipelineStatusForPhase } from '../../../config/pipeline-status.js';
import { PIPELINE_ROUTE_DEFAULT_INTAKE_COLLECTION_MODE } from '../../../config/pipeline-route-defaults.js';
import {
  isDiagnosticIntakePilotEnabled,
  isExecutionPlanCoverageScopeEnabled,
} from '../../../config/feature-flags.js';
import { logger } from '../../../services/logger.js';
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
import { fetchIntakeBriefForAudit } from '../repository/pipeline-brief.repository.js';
import { fetchPendingReviewAfterPhase } from '../repository/pipeline-review.repository.js';
import { runIntakeReadinessPreflight } from './intake-readiness-preflight.js';
import { tryFinalizePipelineAtPlanEnd } from './pipeline-next-finalize.js';

export async function runPipelineNext(params: {
  auditId: string;
  userId: string;
  role: 'consultant' | 'client' | string;
  disableAutoRemediate: boolean;
}): Promise<PipelineNextResult> {
  const { auditId, userId, role, disableAutoRemediate } = params;
  const typedRole = role as 'consultant' | 'client';
  const roleErr = assertPipelineRole(role as 'consultant' | 'client');
  if (roleErr) return { ok: false, error: roleErr };

  const audit = await fetchAuditForNext(auditId, userId);
  if (!audit) return { ok: false, error: pipelineRouteErr.auditNotFound() };

  const accessErr = assertPipelineAccess(audit, userId, typedRole);
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

  if (isDiagnosticIntakePilotEnabled()) {
    const brief = await fetchIntakeBriefForAudit(auditId);
    const collectionMode = brief?.collection_mode ?? PIPELINE_ROUTE_DEFAULT_INTAKE_COLLECTION_MODE;
    const perspective = validationPerspectiveForBriefAccess(audit.user_id, audit.client_id, userId);
    const surface = resolveIntakeSurfaceForPlan(collectionMode, perspective);
    const gatePlanForReadiness = normalizeExecutionPlanFromAuditFields(audit as {
      execution_plan?: Partial<AuditExecutionPlan> | null;
      product_mode?: string | null;
    });
    const slaMode = intakeBriefGateModeFromExecutionPlan(gatePlanForReadiness);
    const preflight = runIntakeReadinessPreflight({
      responses: (brief?.responses ?? {}) as Record<string, unknown>,
      slaProductMode: slaMode,
      collectionMode,
      surface,
      intakeVersionsRaw: (brief?.intake_versions as Record<string, unknown> | null | undefined) ?? null,
      enforcementPoint: 'pipeline_next',
      executionCoveragePackage:
        gatePlanForReadiness.coverage_package === 'starter' || gatePlanForReadiness.coverage_package === 'pro'
          ? gatePlanForReadiness.coverage_package
          : 'complete',
      applyExecutionPlanCoverageScope:
        isDiagnosticIntakePilotEnabled() && isExecutionPlanCoverageScopeEnabled(),
      executionSelectedDomains: gatePlanForReadiness.selected_domains,
      executionIncludeStrategy: gatePlanForReadiness.include_strategy === true,
    });
    if (preflight.blocked) {
      logger.info('pipeline.next.intake_readiness_blocked', {
        auditId,
        kind: 'intake_readiness_blocked',
        flowReadinessStatus: preflight.readiness.flowReadinessStatus,
        auditReadinessStatus: preflight.readiness.auditReadinessStatus,
        trace_codes: preflight.readiness.trace.map(t => t.code),
      });
      return { ok: false, error: preflight.error };
    }
  }

  const plan = normalizeExecutionPlanFromAuditFields(audit as {
    execution_plan?: Partial<AuditExecutionPlan> | null;
    product_mode?: string | null;
  });
  const endState = await tryFinalizePipelineAtPlanEnd({
    auditId,
    userId,
    audit,
    plan,
    disableAutoRemediate,
  });
  if (endState) return endState;

  const maxPhase = maxPhaseForExecutionPlan(plan);
  const nextPhase = executionPlanToPhases(plan)
    .filter((phase) => phase > 0)
    .find((phase) => phase > audit.current_phase);
  if (!nextPhase || nextPhase > maxPhase) return { ok: false, error: pipelineRouteErr.allPhasesComplete() };

  const pendingReview = await fetchPendingReviewAfterPhase(auditId, audit.current_phase);
  if (pendingReview) return { ok: false, error: pipelineRouteErr.reviewPending(audit.current_phase) };

  const lockStatus = pipelineStatusForPhase(nextPhase);
  let claimed = await claimPipelineNext(auditId, userId, audit.updated_at, lockStatus);

  /**
   * Single refetch + second claim: fixes races where `updated_at` or row state changes between
   * read and UPDATE (resume-cancelled → next, double Continue, trigger bump, another tab).
   * If the winner already moved the audit into an active phase, surface phase-in-progress instead of claim conflict.
   */
  if (!claimed) {
    const fresh = await fetchAuditForNext(auditId, userId);
    if (!fresh) return { ok: false, error: pipelineRouteErr.auditNotFound() };

    if (isPipelinePhaseActive(fresh.status)) {
      return { ok: false, error: pipelineRouteErr.phaseInProgress(fresh.status) };
    }

    const accessErr2 = assertPipelineAccess(fresh, userId, typedRole);
    if (accessErr2) return { ok: false, error: accessErr2 };

    const cancelledErr2 = assertNotCancelled(fresh.status);
    if (cancelledErr2) return { ok: false, error: cancelledErr2 };

    const tokenErr2 = assertTokenBudgetAvailable(fresh);
    if (tokenErr2) {
      return {
        ok: false,
        error: pipelineRouteErr.tokenBudgetExceeded({
          tokens_used: fresh.tokens_used,
          token_budget: fresh.token_budget,
        }),
      };
    }

    const pendingReview2 = await fetchPendingReviewAfterPhase(auditId, fresh.current_phase);
    if (pendingReview2) return { ok: false, error: pipelineRouteErr.reviewPending(fresh.current_phase) };

    const plan2 = normalizeExecutionPlanFromAuditFields(fresh as {
      execution_plan?: Partial<AuditExecutionPlan> | null;
      product_mode?: string | null;
    });
    const maxPhase2 = maxPhaseForExecutionPlan(plan2);
    const nextPhase2 = executionPlanToPhases(plan2)
      .filter((phase) => phase > 0)
      .find((phase) => phase > fresh.current_phase);
    if (!nextPhase2 || nextPhase2 > maxPhase2) {
      const finalizeStale = await tryFinalizePipelineAtPlanEnd({
        auditId,
        userId,
        audit: fresh,
        plan: plan2,
        disableAutoRemediate,
      });
      if (finalizeStale) return finalizeStale;
      return { ok: false, error: pipelineRouteErr.allPhasesComplete() };
    }
    if (nextPhase2 !== nextPhase) return { ok: false, error: pipelineRouteErr.nextClaimConflict() };

    claimed = await claimPipelineNext(auditId, userId, fresh.updated_at, lockStatus);
  }

  if (!claimed) return { ok: false, error: pipelineRouteErr.nextClaimConflict() };

  return {
    ok: true,
    outcome: 'running',
    response: { status: 'running', phase: nextPhase },
    nextPhase,
    disableAutoRemediate,
  };
}
