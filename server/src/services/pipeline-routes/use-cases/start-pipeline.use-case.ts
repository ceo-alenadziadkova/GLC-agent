import { currentIntakeVersionTuple, isSupportedIntakeArtifactTuple } from '@glc/intake-core';
import type { AuditExecutionPlan, IntakeVersionTuple } from '../../../types/audit.js';
import { normalizeExecutionPlanFromAuditFields } from '../../pipeline/orchestrator/execution-plan-loader.js';
import { intakeBriefGateModeFromExecutionPlan } from '../../../lib/audit-coverage-bridge.js';
import {
  evaluateBriefGates,
  resolveIntakeSurfaceForPlan,
  validationPerspectiveForBriefAccess,
} from '../../brief-validator.js';
import { PIPELINE_ROUTE_DEFAULT_INTAKE_COLLECTION_MODE } from '../../../config/pipeline-route-defaults.js';
import { pipelineRouteErr } from '../domain/pipeline-route.errors.js';
import {
  assertNotCancelled,
  assertPipelineAccess,
  assertPipelineRole,
  assertTokenBudgetAvailable,
} from '../domain/pipeline-route.guards.js';
import type { PipelineStartResult } from '../domain/pipeline-route.types.js';
import { fetchIntakeBriefForAudit } from '../repository/pipeline-brief.repository.js';
import { claimPipelineStart, fetchAuditForStart } from '../repository/pipeline-audit.repository.js';

export async function runPipelineStart(params: {
  auditId: string;
  userId: string;
  role: 'consultant' | 'client' | string;
  disableAutoRemediate: boolean;
}): Promise<PipelineStartResult> {
  const { auditId, userId, role, disableAutoRemediate } = params;
  const roleErr = assertPipelineRole(role as 'consultant' | 'client');
  if (roleErr) return { ok: false, error: roleErr };

  const audit = await fetchAuditForStart(auditId, userId);
  if (!audit) return { ok: false, error: pipelineRouteErr.auditNotFound() };

  const accessErr = assertPipelineAccess(audit, userId, role as 'consultant' | 'client');
  if (accessErr) return { ok: false, error: accessErr };

  const cancelledErr = assertNotCancelled(audit.status);
  if (cancelledErr) return { ok: false, error: cancelledErr };
  if (audit.status !== 'created') return { ok: false, error: pipelineRouteErr.alreadyStarted(audit.status) };

  const tokenErr = assertTokenBudgetAvailable(audit);
  if (tokenErr) return { ok: false, error: tokenErr };

  const claimed = await claimPipelineStart(auditId, userId, audit.updated_at);
  if (!claimed) return { ok: false, error: pipelineRouteErr.startClaimConflict() };

  const brief = await fetchIntakeBriefForAudit(auditId);
  const collectionMode = brief?.collection_mode ?? PIPELINE_ROUTE_DEFAULT_INTAKE_COLLECTION_MODE;
  const perspective = validationPerspectiveForBriefAccess(audit.user_id, audit.client_id, userId);
  const surface = resolveIntakeSurfaceForPlan(collectionMode, perspective);
  const intakeVersions = brief?.intake_versions as IntakeVersionTuple | null | undefined;
  const intakeTuple =
    intakeVersions && isSupportedIntakeArtifactTuple(intakeVersions) ? intakeVersions : currentIntakeVersionTuple();
  const gatePlan = normalizeExecutionPlanFromAuditFields(audit as {
    execution_plan?: Partial<AuditExecutionPlan> | null;
    product_mode?: string | null;
  });
  const gates = evaluateBriefGates(
    brief?.responses ?? {},
    intakeBriefGateModeFromExecutionPlan(gatePlan),
    collectionMode,
    surface,
    intakeTuple,
  );

  return {
    ok: true,
    response: { status: 'started', phase: 0, intakeProgress: gates.intakeProgress },
    disableAutoRemediate,
  };
}
