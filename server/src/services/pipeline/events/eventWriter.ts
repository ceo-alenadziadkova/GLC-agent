import { getContext, updateContext } from '../../observability-context.js';
import { supabase } from '../../supabase.js';
import { PIPELINE_EVENT_TYPES, PIPELINE_LIFECYCLE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import {
  MS_PER_MINUTE,
  PIPELINE_PHASE_RUN_ATTEMPT_INITIAL,
} from '../../../config/pipeline-orchestrator-constants.js';

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
  const ctx = getContext();

  await supabase.from('pipeline_events').insert({
    audit_id: auditId,
    phase,
    event_type: eventType,
    message,
    data: {
      ...data,
      trace_id: ctx?.traceId,
      operation_id: ctx?.operationId,
    },
  });

  if (phase >= 0 && (PIPELINE_LIFECYCLE_EVENT_TYPES as readonly string[]).includes(eventType)) {
    const mappedStatus = mapEventTypeToPhaseRunStatus(eventType);
    const now = new Date();

    await supabase.from('phase_runs').upsert(
      {
        audit_id: auditId,
        phase,
        attempt: PIPELINE_PHASE_RUN_ATTEMPT_INITIAL,
        status: mappedStatus,
        lease_owner: `pid:${process.pid}`,
        lease_expires_at: new Date(now.getTime() + leaseTimeoutMinutes * MS_PER_MINUTE).toISOString(),
        heartbeat_at: now.toISOString(),
        ...(eventType === PIPELINE_EVENT_TYPES.error ? { error_message: message } : {}),
      },
      { onConflict: 'audit_id,phase,attempt' },
    );
  }
}

