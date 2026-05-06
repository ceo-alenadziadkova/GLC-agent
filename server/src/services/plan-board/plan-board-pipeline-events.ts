import { PIPELINE_EVENT_TYPES } from '../../config/pipeline-event-types.js';
import { logger } from '../logger.js';
import { supabase } from '../supabase.js';

type PlanBoardMovedPayload = {
  role: 'consultant' | 'client';
  from_column: string | null;
  to_column: string | null;
  card_source: string;
};

type PlanBoardPinnedPayload = {
  role: 'consultant' | 'client';
  pinned_count_after: number;
};

type PlanBoardConflictPayload = {
  reason: 'governance_blocked' | 'stale_pack_version' | 'idempotency_mismatch' | 'manual_in_progress_blocked';
  pack_version_seen: number | null;
  pack_version_actual: number | null;
};

type PlanBoardViewOpenedPayload = {
  role: 'consultant' | 'client';
  pack_version: number;
  has_pack: boolean;
};

export async function emitPlanBoardCardMoved(args: {
  auditId: string;
  payload: PlanBoardMovedPayload;
}): Promise<void> {
  const { error } = await supabase.from('pipeline_events').insert({
    audit_id: args.auditId,
    phase: 0,
    event_type: PIPELINE_EVENT_TYPES.planBoardCardMoved,
    message: PIPELINE_EVENT_TYPES.planBoardCardMoved,
    data: args.payload,
  });
  if (error) {
    logger.warn('plan_board.telemetry_move_failed', { auditId: args.auditId, error: error.message });
  }
}

export async function emitPlanBoardCardPinned(args: {
  auditId: string;
  payload: PlanBoardPinnedPayload;
}): Promise<void> {
  const { error } = await supabase.from('pipeline_events').insert({
    audit_id: args.auditId,
    phase: 0,
    event_type: PIPELINE_EVENT_TYPES.planBoardCardPinned,
    message: PIPELINE_EVENT_TYPES.planBoardCardPinned,
    data: args.payload,
  });
  if (error) {
    logger.warn('plan_board.telemetry_pin_failed', { auditId: args.auditId, error: error.message });
  }
}

export async function emitPlanBoardManualInProgressBlocked(args: { auditId: string }): Promise<void> {
  const { error } = await supabase.from('pipeline_events').insert({
    audit_id: args.auditId,
    phase: 0,
    event_type: PIPELINE_EVENT_TYPES.planBoardManualInProgressBlocked,
    message: PIPELINE_EVENT_TYPES.planBoardManualInProgressBlocked,
    data: {},
  });
  if (error) {
    logger.warn('plan_board.telemetry_manual_in_progress_blocked_failed', { auditId: args.auditId, error: error.message });
  }
}

export async function emitPlanBoardConflict409(args: {
  auditId: string;
  payload: PlanBoardConflictPayload;
}): Promise<void> {
  const { error } = await supabase.from('pipeline_events').insert({
    audit_id: args.auditId,
    phase: 0,
    event_type: PIPELINE_EVENT_TYPES.planBoardConflict409,
    message: PIPELINE_EVENT_TYPES.planBoardConflict409,
    data: args.payload,
  });
  if (error) {
    logger.warn('plan_board.telemetry_conflict_failed', { auditId: args.auditId, error: error.message });
  }
}

export async function emitPlanBoardViewOpened(args: {
  auditId: string;
  payload: PlanBoardViewOpenedPayload;
}): Promise<void> {
  const { error } = await supabase.from('pipeline_events').insert({
    audit_id: args.auditId,
    phase: 0,
    event_type: PIPELINE_EVENT_TYPES.planBoardViewOpened,
    message: PIPELINE_EVENT_TYPES.planBoardViewOpened,
    data: args.payload,
  });
  if (error) {
    logger.warn('plan_board.telemetry_view_open_failed', { auditId: args.auditId, error: error.message });
  }
}

export async function countPinnedPlanBoardCards(auditId: string): Promise<number> {
  const { count, error } = await supabase
    .from('plan_task_delivery')
    .select('id', { count: 'exact', head: true })
    .eq('audit_id', auditId)
    .eq('pinned', true);
  if (error || typeof count !== 'number') return 0;
  return count;
}
