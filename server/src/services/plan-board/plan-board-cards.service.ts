import type { PlanTaskDeliveryCardSnapshot } from './reconcile.js';
import { supabase } from '../supabase.js';

export async function listPlanBoardCardsForAudit(args: { auditId: string }): Promise<{
  cards: PlanTaskDeliveryCardSnapshot[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from('plan_task_delivery')
    .select(
      'id, source, canonical_node_key, pack_graph_node_id, pack_lane_snapshot, manual_title, delivery_area, column_id, position, pinned, last_applied_pack_version, orphaned_reason',
    )
    .eq('audit_id', args.auditId)
    .order('column_id')
    .order('position');

  if (error) return { cards: [], error: new Error(error.message) };

  const cards: PlanTaskDeliveryCardSnapshot[] = (data ?? []).map(row => ({
    id: row.id as string,
    source: row.source as 'pack' | 'manual',
    canonical_node_key: (row.canonical_node_key ?? null) as string | null,
    pack_graph_node_id: (row.pack_graph_node_id ?? null) as string | null,
    pack_lane_snapshot: (row.pack_lane_snapshot ?? null) as string | null,
    manual_title: (row.manual_title ?? null) as string | null,
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
