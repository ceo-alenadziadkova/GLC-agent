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
   * When `false`: log failure via `logger.error` (`pipeline.pipeline_events_insert_failed`) but **do not throw**.
   * Intended only for **best-effort secondary telemetry** on paths that already surfaced or will surface a primary
   * error to the user (so a lost event row cannot mask the originating failure).
   *
   * **Current call-sites with `rethrowOnError: false`:**
   * - `services/orchestration/orchestration-pack-synthesis-claude.ts`
   * - `services/orchestration/orchestration-synthesis.service.ts`
   * - `services/strategy/strategy-execution-pack-claude.ts`
   *
   * Do not use for primary pipeline lifecycle writes; prefer `true` (default) so inserts fail loudly.
   */
  rethrowOnError?: boolean;
};

/**
 * Single insert into `pipeline_events` with mandatory error handling by default.
 * Supabase resolves even on PostgREST failures — callers must not omit `error` handling when customizing behavior.
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
