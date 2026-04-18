import { PIPELINE_CANCELLED_BY_USER_MESSAGE } from '../../../config/api-error-codes.js';
import { pipelineRouteErr } from '../domain/pipeline-route.errors.js';
import { assertNotCancelled, assertPipelineAccess, assertPipelineRole, isPipelineTerminal } from '../domain/pipeline-route.guards.js';
import type { PipelineStopResult } from '../domain/pipeline-route.types.js';
import { claimPipelineStop, fetchAuditForStop } from '../repository/pipeline-audit.repository.js';
import { insertPipelineCancelledEvent } from '../repository/pipeline-event.repository.js';

export async function runPipelineStop(params: {
  auditId: string;
  userId: string;
  role: 'consultant' | 'client' | string;
}): Promise<PipelineStopResult> {
  const { auditId, userId, role } = params;
  const roleErr = assertPipelineRole(role as 'consultant' | 'client');
  if (roleErr) return { ok: false, error: roleErr };

  const audit = await fetchAuditForStop(auditId, userId);
  if (!audit) return { ok: false, error: pipelineRouteErr.auditNotFound() };

  const accessErr = assertPipelineAccess(audit, userId, role as 'consultant' | 'client');
  if (accessErr) return { ok: false, error: accessErr };

  const cancelledErr = assertNotCancelled(audit.status);
  if (cancelledErr) return { ok: false, error: cancelledErr };
  if (isPipelineTerminal(audit.status)) return { ok: false, error: pipelineRouteErr.alreadyTerminal() };

  const claimed = await claimPipelineStop(auditId, userId, audit.updated_at);
  if (!claimed) return { ok: false, error: pipelineRouteErr.stopClaimConflict() };

  await insertPipelineCancelledEvent({
    auditId,
    phase: audit.current_phase,
    message: PIPELINE_CANCELLED_BY_USER_MESSAGE,
    actorRole: role,
    actorUserId: userId,
  });

  return { ok: true, response: { status: 'cancelled', stopped: true } };
}
