import type { PlanBoardCardDto } from '../data/api/audits-orchestration';
import type { RoadmapGanttPlanBoardHydration } from '../components/roadmap-gantt/types';
import type { RoadmapGanttTask } from './roadmap-gantt-mapper';

/**
 * Build a lookup from `pack_graph_node_id` to the matching Plan Board row. Rows without a
 * pack node id are intentionally skipped — only pack-sourced cards can drive timeline edits.
 */
export function buildBoardRowByPackNodeId(
  cards: readonly PlanBoardCardDto[] | undefined,
): Map<string, PlanBoardCardDto> {
  const map = new Map<string, PlanBoardCardDto>();
  if (!cards) return map;
  for (const row of cards) {
    if (row.pack_graph_node_id) {
      map.set(row.pack_graph_node_id, row);
    }
  }
  return map;
}

/**
 * Decide whether timeline DnD/resize edits are allowed. Edits are gated by:
 * - hydration must be present and `enabled`
 * - none of the blocking signals (`pending`/`fetchFailed`/`blockedGovernance`/`blockedNoPack`)
 * - the consumer must be a consultant (clients cannot mutate Plan Board rows from Roadmap)
 */
export function computeTimelineBoardEditEnabled(args: {
  isClient: boolean;
  planBoardHydration: RoadmapGanttPlanBoardHydration;
}): boolean {
  const { isClient, planBoardHydration } = args;
  return (
    !isClient &&
    Boolean(planBoardHydration?.enabled) &&
    !planBoardHydration?.pending &&
    !planBoardHydration?.fetchFailed &&
    !planBoardHydration?.blockedGovernance &&
    !planBoardHydration?.blockedNoPack
  );
}

/**
 * Compute the set of timeline task ids that are eligible for inline edit, given the
 * current edit gate and a `boardRowByPackNodeId` lookup. Milestones are always excluded.
 */
export function computeTimelineEditableTaskIds(
  boardEditEnabled: boolean,
  timelineTasks: readonly RoadmapGanttTask[],
  boardRowByPackNodeId: ReadonlyMap<string, PlanBoardCardDto>,
): ReadonlySet<string> {
  const set = new Set<string>();
  if (!boardEditEnabled) return set;
  for (const task of timelineTasks) {
    if (task.kind !== 'task') continue;
    if (boardRowByPackNodeId.has(task.id)) {
      set.add(task.id);
    }
  }
  return set;
}
