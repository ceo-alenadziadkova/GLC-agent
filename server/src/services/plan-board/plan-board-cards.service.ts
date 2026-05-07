import type { PlanTaskDeliveryCardSnapshot } from './reconcile.js';
import { supabase } from '../supabase.js';

export async function listPlanBoardCardsForAudit(args: { auditId: string }): Promise<{
  cards: PlanTaskDeliveryCardSnapshot[];
  error: Error | null;
}> {
  const selectLegacy =
    'id, source, canonical_node_key, pack_graph_node_id, pack_lane_snapshot, manual_title, delivery_area, column_id, position, pinned, last_applied_pack_version, orphaned_reason, updated_by_user_id';
  const selectExtended =
    'id, source, canonical_node_key, pack_graph_node_id, pack_lane_snapshot, manual_title, ticket_description, assignee, assignee_user_id, labels, story_points, priority, start_date, due_date, end_date, updated_by_user_id, delivery_area, column_id, position, pinned, last_applied_pack_version, orphaned_reason';

  let queryResult = await supabase
    .from('plan_task_delivery')
    .select(selectExtended)
    .eq('audit_id', args.auditId)
    .order('column_id')
    .order('position');

  if (queryResult.error && isMissingTicketColumnsError(queryResult.error.message)) {
    queryResult = await supabase
      .from('plan_task_delivery')
      .select(selectLegacy)
      .eq('audit_id', args.auditId)
      .order('column_id')
      .order('position');
  }

  const { data, error } = queryResult;
  if (error) return { cards: [], error: new Error(error.message) };

  const cards: PlanTaskDeliveryCardSnapshot[] = (data ?? []).map(row => ({
    id: row.id as string,
    source: row.source as 'pack' | 'manual',
    canonical_node_key: (row.canonical_node_key ?? null) as string | null,
    pack_graph_node_id: (row.pack_graph_node_id ?? null) as string | null,
    pack_lane_snapshot: (row.pack_lane_snapshot ?? null) as string | null,
    manual_title: (row.manual_title ?? null) as string | null,
    ticket_description: (row.ticket_description ?? null) as string | null,
    assignee: (row.assignee ?? null) as string | null,
    assignee_user_id: (row.assignee_user_id ?? null) as string | null,
    labels: Array.isArray(row.labels) ? (row.labels as string[]) : [],
    story_points: row.story_points == null ? null : Number(row.story_points),
    priority: (row.priority ?? null) as 'low' | 'medium' | 'high' | 'urgent' | null,
    start_date: (row.start_date ?? null) as string | null,
    due_date: (row.due_date ?? null) as string | null,
    end_date: (row.end_date ?? null) as string | null,
    updated_by_user_id: (row.updated_by_user_id ?? null) as string | null,
    delivery_area: row.delivery_area as string,
    column_id: row.column_id as string,
    position: Number(row.position),
    pinned: Boolean(row.pinned),
    last_applied_pack_version:
      typeof row.last_applied_pack_version === 'number' ? row.last_applied_pack_version : null,
    orphaned_reason: (row.orphaned_reason ?? null) as 'node_removed' | 'lane_changed' | null,
  }));

  return { cards, error: null };
}

function isMissingTicketColumnsError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes('ticket_description')
    || lower.includes('assignee')
    || lower.includes('priority')
    || lower.includes('assignee_user_id')
    || lower.includes('labels')
    || lower.includes('story_points')
    || lower.includes('start_date')
    || lower.includes('due_date')
    || lower.includes('end_date')
  );
}
