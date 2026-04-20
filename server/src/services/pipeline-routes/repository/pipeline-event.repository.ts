import { PIPELINE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import { PIPELINE_STATUS_EVENTS_LIMIT } from '../../../config/route-query-limits.js';
import { isPipelineDebugLogsEnabled } from '../../../config/feature-flags.js';
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

export async function fetchPipelineEventsForAudit(
  auditId: string,
  query?: {
    limit?: number;
    before?: string;
    phase?: number;
    event_type?: string;
    detail_level?: 'default' | 'debug';
  },
): Promise<unknown[]> {
  const maxRows = query?.limit ?? PIPELINE_STATUS_EVENTS_LIMIT;
  let dbQuery = supabase
    .from('pipeline_events')
    .select('*')
    .eq('audit_id', auditId)
    .order('created_at', { ascending: false })
    .limit(maxRows);
  if (query?.before) dbQuery = dbQuery.lt('created_at', query.before);
  if (query?.phase !== undefined) dbQuery = dbQuery.eq('phase', query.phase);
  if (query?.event_type) dbQuery = dbQuery.eq('event_type', query.event_type);
  const { data } = await dbQuery;
  const debugEnabled = isPipelineDebugLogsEnabled();
  if (query?.detail_level === 'debug' && debugEnabled) return data ?? [];
  return (data ?? []).map((event) => {
    const row = event as { data?: Record<string, unknown> };
    if (!row.data || typeof row.data !== 'object') return event;
    const nextData = { ...row.data };
    if (nextData.detail_level === 'debug' || !debugEnabled) {
      delete nextData.prompt;
      delete nextData.raw_response;
      delete nextData.trace_id;
      delete nextData.operation_id;
    }
    return { ...(event as Record<string, unknown>), data: nextData };
  });
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
