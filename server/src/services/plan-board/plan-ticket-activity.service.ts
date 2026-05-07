import { supabase } from '../supabase.js';
import { logger } from '../logger.js';

export type PlanTicketFieldChanges = Record<string, { from: unknown; to: unknown }>;

export async function appendPlanTicketEvent(args: {
  auditId: string;
  cardId: string;
  actorUserId: string | null;
  action: 'create' | 'update' | 'move' | 'delete' | 'batch_update' | 'comment';
  sourceSurface?: 'board' | 'table' | 'roadmap' | 'shape' | 'api';
  fieldChanges?: PlanTicketFieldChanges;
}): Promise<void> {
  try {
    const table = supabase.from('plan_ticket_events') as { insert?: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }> };
    if (typeof table.insert !== 'function') return;
    const { error } = await table.insert({
      audit_id: args.auditId,
      card_id: args.cardId,
      actor_user_id: args.actorUserId,
      action: args.action,
      source_surface: args.sourceSurface ?? 'board',
      field_changes: args.fieldChanges ?? {},
    });
    if (error) {
      logger.warn('plan_ticket.event_append_failed', {
        auditId: args.auditId,
        cardId: args.cardId,
        action: args.action,
        error: error.message,
      });
    }
  } catch (error) {
    logger.warn('plan_ticket.event_append_failed_unhandled', {
      auditId: args.auditId,
      cardId: args.cardId,
      action: args.action,
      error: (error as Error).message,
    });
  }
}

export async function listPlanTicketEvents(args: { auditId: string; cardId: string; limit: number }): Promise<{
  rows: Array<{
    id: string;
    actor_user_id: string | null;
    source_surface: string;
    action: string;
    field_changes: Record<string, unknown>;
    created_at: string;
  }>;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from('plan_ticket_events')
    .select('id, actor_user_id, source_surface, action, field_changes, created_at')
    .eq('audit_id', args.auditId)
    .eq('card_id', args.cardId)
    .order('created_at', { ascending: false })
    .limit(args.limit);
  if (error) return { rows: [], error: new Error(error.message) };
  return { rows: (data ?? []) as Array<{
    id: string;
    actor_user_id: string | null;
    source_surface: string;
    action: string;
    field_changes: Record<string, unknown>;
    created_at: string;
  }>, error: null };
}

export async function listPlanTicketComments(args: { auditId: string; cardId: string; limit: number }): Promise<{
  rows: Array<{
    id: string;
    author_user_id: string | null;
    body: string;
    mentions: string[];
    created_at: string;
    updated_at: string;
  }>;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from('plan_ticket_comments')
    .select('id, author_user_id, body, mentions, created_at, updated_at')
    .eq('audit_id', args.auditId)
    .eq('card_id', args.cardId)
    .order('created_at', { ascending: false })
    .limit(args.limit);
  if (error) return { rows: [], error: new Error(error.message) };
  return { rows: (data ?? []) as Array<{
    id: string;
    author_user_id: string | null;
    body: string;
    mentions: string[];
    created_at: string;
    updated_at: string;
  }>, error: null };
}

export async function createPlanTicketComment(args: {
  auditId: string;
  cardId: string;
  authorUserId: string | null;
  body: string;
  mentions: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: Error }> {
  const { data, error } = await supabase
    .from('plan_ticket_comments')
    .insert({
      audit_id: args.auditId,
      card_id: args.cardId,
      author_user_id: args.authorUserId,
      body: args.body,
      mentions: args.mentions,
    })
    .select('id')
    .single();
  if (error || !data?.id) return { ok: false, error: new Error(error?.message ?? 'insert_failed') };
  return { ok: true, id: data.id as string };
}
