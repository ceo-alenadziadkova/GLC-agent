import { logger } from '../../logger.js';
import { updateContext } from '../../observability-context.js';
import { supabase } from '../../supabase.js';
import { insertPipelineEventRow } from './insert-pipeline-event.js';
import { PIPELINE_EVENT_TYPES, PIPELINE_LIFECYCLE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import { MS_PER_MINUTE } from '../../../config/pipeline-orchestrator-constants.js';
import { resolvePhaseRunLeaseForWrite } from '../phase-run-lease-context.js';

export type PipelineEventWriterPayload = {
  auditId: string;
  phase: number;
  eventType: string;
  message: string;
  data?: Record<string, unknown>;
  leaseTimeoutMinutes: number;
};

function mapEventTypeToPhaseRunStatus(eventType: string): 'running' | 'completed' | 'failed' {
  if (eventType === PIPELINE_EVENT_TYPES.started) return 'running';
  if (eventType === PIPELINE_EVENT_TYPES.completed) return 'completed';
  return 'failed';
}

/**
 * Writes `pipeline_events` and mirrors lifecycle into `phase_runs`.
 * No notifications here: keep side effects separated for easier testing.
 */
export async function writePipelineEventAndPhaseRun(payload: PipelineEventWriterPayload): Promise<void> {
  const { auditId, phase, eventType, message, data = {}, leaseTimeoutMinutes } = payload;

  updateContext({ auditId });
  const lease = resolvePhaseRunLeaseForWrite(undefined);

  await insertPipelineEventRow({
    auditId,
    phase,
    eventType,
    message,
    data,
  });

  if (phase >= 0 && (PIPELINE_LIFECYCLE_EVENT_TYPES as readonly string[]).includes(eventType)) {
    const mappedStatus = mapEventTypeToPhaseRunStatus(eventType);
    const now = new Date();

    const { error: upsertError } = await supabase.from('phase_runs').upsert(
      {
        audit_id: auditId,
        phase,
        attempt: lease.attempt,
        status: mappedStatus,
        lease_owner: lease.leaseOwner,
        lease_expires_at: new Date(now.getTime() + leaseTimeoutMinutes * MS_PER_MINUTE).toISOString(),
        heartbeat_at: now.toISOString(),
        ...(eventType === PIPELINE_EVENT_TYPES.error ? { error_message: message } : {}),
      },
      { onConflict: 'audit_id,phase,attempt' },
    );

    if (upsertError) {
      logger.error('pipeline.phase_runs_upsert_failed', {
        component: 'pipeline',
        audit_id: auditId,
        phase,
        event_type: eventType,
        error: upsertError.message,
      });
      throw upsertError;
    }
  }
}
