import { PIPELINE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import { PIPELINE_STATUS_EVENTS_LIMIT } from '../../../config/route-query-limits.js';
import { supabase } from '../../supabase.js';

export async function insertPipelineCancelledEvent(params: {
  auditId: string;
  phase: number;
  message: string;
  actorRole: string;
  actorUserId: string;
}): Promise<void> {
  const { auditId, phase, message, actorRole, actorUserId } = params;
  await supabase.from('pipeline_events').insert({
    audit_id: auditId,
    phase,
    event_type: PIPELINE_EVENT_TYPES.cancelled,
    message,
    data: { actor_role: actorRole, actor_user_id: actorUserId },
  });
}

export async function insertPipelineResumedFromCancelledEvent(params: {
  auditId: string;
  phase: number;
  message: string;
  actorUserId: string;
}): Promise<void> {
  const { auditId, phase, message, actorUserId } = params;
  await supabase.from('pipeline_events').insert({
    audit_id: auditId,
    phase,
    event_type: PIPELINE_EVENT_TYPES.resumedFromCancelled,
    message,
    data: { actor_user_id: actorUserId },
  });
}

export async function fetchPipelineEventsForAudit(auditId: string): Promise<unknown[]> {
  const { data } = await supabase
    .from('pipeline_events')
    .select('*')
    .eq('audit_id', auditId)
    .order('created_at', { ascending: false })
    .limit(PIPELINE_STATUS_EVENTS_LIMIT);
  return data ?? [];
}

export async function fetchLatestQualityGateEventData(auditId: string, phase: number): Promise<unknown | null> {
  const { data } = await supabase
    .from('pipeline_events')
    .select('data, created_at')
    .eq('audit_id', auditId)
    .eq('phase', phase)
    .eq('event_type', PIPELINE_EVENT_TYPES.qualityGate)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data ? (data as { data: unknown }).data : null;
}

export async function fetchLatestQualityGateEventReport(auditId: string, phase: number): Promise<unknown | null> {
  const { data } = await supabase
    .from('pipeline_events')
    .select('data')
    .eq('audit_id', auditId)
    .eq('phase', phase)
    .eq('event_type', PIPELINE_EVENT_TYPES.qualityGate)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data ? (data as { data: unknown }).data : null;
}

export async function insertReviewApprovedEvent(params: {
  auditId: string;
  phase: number;
  message: string;
}): Promise<void> {
  const { auditId, phase, message } = params;
  // Notes live on `review_points` only; omit from events so client Realtime subscribers never see them.
  await supabase.from('pipeline_events').insert({
    audit_id: auditId,
    phase,
    event_type: PIPELINE_EVENT_TYPES.reviewApproved,
    message,
    data: {},
  });
}
