/**
 * Supabase Realtime `postgres_changes` contract for the pipeline hook.
 * Keeps table/column identifiers in one place (migrations should update here + DB).
 */

import type { PipelineEvent } from '../data/auditTypes';

export const PIPELINE_REALTIME_SCHEMA = 'public' as const;

export const PIPELINE_REALTIME_TABLE_EVENTS = 'pipeline_events' as const;
export const PIPELINE_REALTIME_TABLE_AUDITS = 'audits' as const;

/** Filter field on `pipeline_events` for audit-scoped INSERT channels. */
export const PIPELINE_REALTIME_FILTER_AUDIT_ID_FIELD = 'audit_id' as const;
/** Primary key field on `audits` for UPDATE channels. */
export const PIPELINE_REALTIME_FILTER_AUDIT_PK_FIELD = 'id' as const;

/** Narrow `.new` carrier for realtime handlers (broader payloads are OK at runtime). */
export type PipelineRealtimePostgresChangePayload = {
  readonly new: unknown;
};

/**
 * Stable `postgres_changes` config for INSERT on `pipeline_events` scoped by audit.
 */
export function buildPipelineRealtimeEventsInsertSubscribe(auditId: string) {
  return {
    event: 'INSERT' as const,
    schema: PIPELINE_REALTIME_SCHEMA,
    table: PIPELINE_REALTIME_TABLE_EVENTS,
    filter: `${PIPELINE_REALTIME_FILTER_AUDIT_ID_FIELD}=eq.${auditId}`,
  };
}

/**
 * Stable `postgres_changes` config for UPDATE on `audits` by primary key.
 */
export function buildPipelineRealtimeAuditsUpdateSubscribe(auditId: string) {
  return {
    event: 'UPDATE' as const,
    schema: PIPELINE_REALTIME_SCHEMA,
    table: PIPELINE_REALTIME_TABLE_AUDITS,
    filter: `${PIPELINE_REALTIME_FILTER_AUDIT_PK_FIELD}=eq.${auditId}`,
  };
}

/** Subset of `audits` rows delivered on Realtime UPDATE (UI pipeline header). */
export type AuditsPipelineRealtimePatch = {
  status: string;
  current_phase: number;
  tokens_used: number;
};

export function parsePipelineEventInsertPayload(newRow: unknown): PipelineEvent | null {
  if (!newRow || typeof newRow !== 'object') return null;
  const r = newRow as Record<string, unknown>;
  const idOk = typeof r.id === 'number' || (typeof r.id === 'string' && r.id.length > 0);
  if (
    !idOk ||
    typeof r.audit_id !== 'string' ||
    typeof r.phase !== 'number' ||
    typeof r.event_type !== 'string' ||
    typeof r.created_at !== 'string' ||
    !(r.message === null || typeof r.message === 'string') ||
    !r.data ||
    typeof r.data !== 'object'
  ) {
    return null;
  }
  if (r.event_seq !== undefined && typeof r.event_seq !== 'number') {
    return null;
  }
  return newRow as PipelineEvent;
}

export function parseAuditsRealtimePatch(newRow: unknown): Partial<AuditsPipelineRealtimePatch> | null {
  if (!newRow || typeof newRow !== 'object') return null;
  const r = newRow as Record<string, unknown>;
  const out: Partial<AuditsPipelineRealtimePatch> = {};
  if (typeof r.status === 'string') out.status = r.status;
  if (typeof r.current_phase === 'number') out.current_phase = r.current_phase;
  if (typeof r.tokens_used === 'number') out.tokens_used = r.tokens_used;
  return Object.keys(out).length > 0 ? out : null;
}
