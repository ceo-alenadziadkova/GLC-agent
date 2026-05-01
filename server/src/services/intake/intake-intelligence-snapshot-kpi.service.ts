import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';

/**
 * Persists a single `pipeline_events` row for `POST /api/intake/:token/intelligence-snapshot` (F2 + merge preview KPIs).
 */
export async function recordIntakeIntelligenceSnapshotKpi(args: {
  auditId: string | null;
  intakeTokenId?: string;
  mergeWouldApplyCount: number;
  snapshotNoNewInferred: boolean;
  f2Source: 'llm' | 'deterministic' | 'llm_mixed';
  invalidF2IdsFiltered: number;
  f2SuggestionLength: number;
  llmError?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('pipeline_events').insert({
    audit_id: args.auditId,
    phase: 0,
    event_type: PIPELINE_EVENT_TYPES.intakeIntelligenceSnapshot,
    message: 'Public intake: intelligence snapshot (F2 + inferred preview)',
    data: {
      intake_intelligence_snapshot: true,
      merge_would_apply_count: args.mergeWouldApplyCount,
      snapshot_no_new_inferred: args.snapshotNoNewInferred,
      f2_source: args.f2Source,
      invalid_f2_ids_filtered: args.invalidF2IdsFiltered,
      f2_suggestion_length: args.f2SuggestionLength,
      intake_token_id: args.intakeTokenId ?? null,
      ...(args.llmError ? { llm_error: args.llmError } : {}),
    },
  });
  if (error) {
    logger.warn('intake.intelligence_snapshot_kpi_insert_failed', {
      component: 'intake',
      message: error.message,
    });
  }
}
