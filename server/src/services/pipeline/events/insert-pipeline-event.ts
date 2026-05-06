import { logger } from '../../logger.js';
import { getContext, updateContext } from '../../observability-context.js';
import { supabase } from '../../supabase.js';

export type InsertPipelineEventParams = {
  auditId: string;
  phase: number;
  eventType: string;
  message: string;
  data?: Record<string, unknown>;
  /**
   * When true (default), merges `trace_id` / `operation_id` from observability context into `data`.
   */
  mergeObservabilityContext?: boolean;
  /**
   * When false, log insert failure but do not throw (e.g. secondary telemetry while handling another error).
   */
  rethrowOnError?: boolean;
};

/**
 * Single insert into `pipeline_events` with mandatory error handling.
 * Supabase resolves even on PostgREST failures — callers must not ignore `error`.
 */
export async function insertPipelineEventRow(params: InsertPipelineEventParams): Promise<void> {
  const {
    auditId,
    phase,
    eventType,
    message,
    data = {},
    mergeObservabilityContext = true,
    rethrowOnError = true,
  } = params;

  updateContext({ auditId });
  const ctx = getContext();
  const mergedData = mergeObservabilityContext
    ? {
        ...data,
        ...(ctx?.traceId ? { trace_id: ctx.traceId } : {}),
        ...(ctx?.operationId ? { operation_id: ctx.operationId } : {}),
      }
    : { ...data };

  const { error } = await supabase.from('pipeline_events').insert({
    audit_id: auditId,
    phase,
    event_type: eventType,
    message,
    data: mergedData,
  });

  if (error) {
    logger.error('pipeline.pipeline_events_insert_failed', {
      component: 'pipeline_events',
      audit_id: auditId,
      phase,
      event_type: eventType,
      error: error.message,
      code: error.code,
    });
    if (rethrowOnError) {
      throw error;
    }
  }
}
