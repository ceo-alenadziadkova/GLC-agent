import type { RoadmapGanttPlanBoardHydration } from '../components/roadmap-gantt/types';
import type { RoadmapGanttTask } from './roadmap-gantt-mapper';
import type { TaskDetailsPlanBoardMove } from '../components/roadmap-gantt/TaskDetailsDrawer';

/**
 * Resolve the Plan Board move affordance for the currently opened drawer task.
 *
 * Statuses follow the cross-view contract in {@link TaskDetailsPlanBoardMove}: hydration
 * issues short-circuit before we look at the drawer task; if no row matches by either
 * `pack_graph_node_id` or `canonical_node_key`, the affordance falls back to `no_row`.
 */
export function computeTaskPlanBoardMove(args: {
  planBoardHydration: RoadmapGanttPlanBoardHydration;
  drawerTask: RoadmapGanttTask | null;
}): TaskDetailsPlanBoardMove {
  const { planBoardHydration: h, drawerTask } = args;
  if (!h?.enabled) return { status: 'off' };
  if (h.fetchFailed) return { status: 'query_failed' };
  if (h.pending) return { status: 'loading' };
  if (h.blockedNoPack) return { status: 'blocked_no_pack' };
  if (h.blockedGovernance) return { status: 'blocked_governance' };
  if (!drawerTask || drawerTask.kind !== 'task') return { status: 'off' };
  const row =
    [...h.cards].find((c) => c.pack_graph_node_id === drawerTask.id) ??
    [...h.cards].find((c) => c.canonical_node_key === drawerTask.id) ??
    null;
  if (!row) return { status: 'no_row' };
  return { status: 'ready', row, packVersion: h.packVersionUsed, role: h.role };
}
