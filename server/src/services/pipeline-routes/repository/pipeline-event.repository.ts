import { PIPELINE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import { POSTGREST_NO_ROWS_CODE } from '../../../config/postgrest-codes.js';
import { PIPELINE_STATUS_EVENTS_LIMIT } from '../../../config/route-query-limits.js';
import { isPipelineDebugLogsEnabled } from '../../../config/feature-flags.js';
import { supabase } from '../../supabase.js';
import { logger } from '../../logger.js';
import { insertPipelineEventRow } from '../../pipeline/events/insert-pipeline-event.js';

export async function insertPipelineCancelledEvent(params: {
  auditId: string;
  phase: number;
  message: string;
  actorRole: string;
  actorUserId: string;
}): Promise<void> {
  const { auditId, phase, message, actorRole, actorUserId } = params;
  await insertPipelineEventRow({
    auditId,
    phase,
    eventType: PIPELINE_EVENT_TYPES.cancelled,
    message,
    data: { actor_role: actorRole, actor_user_id: actorUserId },
    mergeObservabilityContext: false,
  });
}

export async function insertPipelineResumedFromCancelledEvent(params: {
  auditId: string;
  phase: number;
  message: string;
  actorUserId: string;
}): Promise<void> {
  const { auditId, phase, message, actorUserId } = params;
  await insertPipelineEventRow({
    auditId,
    phase,
    eventType: PIPELINE_EVENT_TYPES.resumedFromCancelled,
    message,
    data: { actor_user_id: actorUserId },
    mergeObservabilityContext: false,
  });
}

export async function insertPipelineRetryRequestedEvent(params: {
  auditId: string;
  phase: number;
  actorUserId: string;
  retryComment?: string;
}): Promise<void> {
  const { auditId, phase, actorUserId, retryComment } = params;
  await insertPipelineEventRow({
    auditId,
    phase,
    eventType: PIPELINE_EVENT_TYPES.log,
    message: retryComment
      ? `Consultant requested re-run for phase ${phase}. Comment: ${retryComment}`
      : `Consultant requested re-run for phase ${phase}.`,
    data: {
      actor_user_id: actorUserId,
      action: 'retry_requested',
      retry_comment: retryComment ?? null,
    },
    mergeObservabilityContext: false,
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
    .order('event_seq', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(maxRows);
  if (query?.before) dbQuery = dbQuery.lt('created_at', query.before);
  if (query?.phase !== undefined) dbQuery = dbQuery.eq('phase', query.phase);
  if (query?.event_type) dbQuery = dbQuery.eq('event_type', query.event_type);
  const { data, error } = await dbQuery;
  if (error) {
    logger.error('pipeline.fetch_events_failed', {
      audit_id: auditId,
      error: error.message,
    });
    throw error;
  }
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
  const { data, error } = await supabase
    .from('pipeline_events')
    .select('data, created_at')
    .eq('audit_id', auditId)
    .eq('phase', phase)
    .eq('event_type', PIPELINE_EVENT_TYPES.qualityGate)
    .order('event_seq', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== POSTGREST_NO_ROWS_CODE) {
    logger.warn('pipeline.fetch_quality_gate_event_data_failed', {
      component: 'pipeline_events',
      audit_id: auditId,
      phase,
      error: error.message,
      code: error.code,
    });
    return null;
  }
  return data ? (data as { data: unknown }).data : null;
}

export async function fetchLatestQualityGateEventReport(auditId: string, phase: number): Promise<unknown | null> {
  const { data, error } = await supabase
    .from('pipeline_events')
    .select('data')
    .eq('audit_id', auditId)
    .eq('phase', phase)
    .eq('event_type', PIPELINE_EVENT_TYPES.qualityGate)
    .order('event_seq', { ascending: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== POSTGREST_NO_ROWS_CODE) {
    logger.warn('pipeline.fetch_quality_gate_event_report_failed', {
      component: 'pipeline_events',
      audit_id: auditId,
      phase,
      error: error.message,
      code: error.code,
    });
    return null;
  }
  return data ? (data as { data: unknown }).data : null;
}

