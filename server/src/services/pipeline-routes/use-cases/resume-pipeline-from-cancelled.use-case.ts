import { canManagePlatformSettings } from '../../../lib/platform-admin.js';
import { PIPELINE_RESUMED_FROM_CANCELLED_LOG_MESSAGE } from '../../../config/api-user-messages.en.js';
import { logger } from '../../../services/logger.js';
import { pipelineRouteErr } from '../domain/pipeline-route.errors.js';
import { assertTokenBudgetAvailable } from '../domain/pipeline-route.guards.js';
import type { PipelineResumeFromCancelledResult } from '../domain/pipeline-route.types.js';
import { schedulePipelineExecution } from '../orchestration/schedule-pipeline-execution.js';
import {
  claimPipelineResumeFromCancelled,
  fetchAuditForRetryById,
} from '../repository/pipeline-audit.repository.js';
import { insertPipelineResumedFromCancelledEvent } from '../repository/pipeline-event.repository.js';
import { runPipelineNext } from './next-pipeline.use-case.js';

export async function runPipelineResumeFromCancelled(params: {
  auditId: string;
  actorUserId: string;
}): Promise<PipelineResumeFromCancelledResult> {
  const { auditId, actorUserId } = params;

  if (!(await canManagePlatformSettings(actorUserId))) {
    return { ok: false, error: pipelineRouteErr.forbidden() };
  }

  const audit = await fetchAuditForRetryById(auditId);
  if (!audit) return { ok: false, error: pipelineRouteErr.auditNotFound() };

  if (audit.status !== 'cancelled') {
    return { ok: false, error: pipelineRouteErr.resumeNotCancelled(audit.status) };
  }

  const tokenErr = assertTokenBudgetAvailable(audit);
  if (tokenErr) return { ok: false, error: tokenErr };

  const currentPhase = Number(audit.current_phase ?? 0);

  const claimed = await claimPipelineResumeFromCancelled(auditId, audit.updated_at);
  if (!claimed) return { ok: false, error: pipelineRouteErr.resumeClaimConflict() };

  await insertPipelineResumedFromCancelledEvent({
    auditId,
    phase: currentPhase,
    message: PIPELINE_RESUMED_FROM_CANCELLED_LOG_MESSAGE,
    actorUserId,
  });

  /**
   * Best-effort: same as owner pressing Continue (`POST .../pipeline/next`).
   * Uses `audit.user_id` so platform admins can resume audits they do not own.
   * Skipped when next is not allowed (e.g. pending review gate).
   */
  const nextResult = await runPipelineNext({
    auditId,
    userId: audit.user_id,
    role: 'consultant',
    disableAutoRemediate: false,
  });

  if (nextResult.ok) {
    if (nextResult.outcome === 'running') {
      void schedulePipelineExecution({
        auditId,
        action: 'next',
        phase: nextResult.nextPhase,
        disableAutoRemediate: nextResult.disableAutoRemediate,
      });
      return {
        ok: true,
        response: {
          status: 'running',
          current_phase: nextResult.nextPhase,
          resumed: true,
          execution_scheduled: true,
        },
      };
    }
    return {
      ok: true,
      response: {
        status: 'completed',
        current_phase: audit.current_phase,
        resumed: true,
        execution_scheduled: false,
      },
    };
  }

  logger.info('pipeline.resume_cancelled_auto_next_skipped', {
    auditId,
    status: nextResult.error.status,
    code: typeof nextResult.error.body?.code === 'string' ? nextResult.error.body.code : undefined,
  });

  return {
    ok: true,
    response: {
      status: 'review',
      current_phase: currentPhase,
      resumed: true,
      execution_scheduled: false,
    },
  };
}
