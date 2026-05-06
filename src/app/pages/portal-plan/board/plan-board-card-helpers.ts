import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import {
  ORCHESTRATION_LANE_LABELS,
  type OrchestrationLaneId,
} from '../../../config/orchestration-roadmap-ui-copy.en';
import type { PlanBoardCardDto, PlanBoardGetBody } from '../../../data/api/audits-orchestration';

export function manualCardNeedsPackAlignmentBanner(
  boardColumns: PlanBoardGetBody['columns'] | undefined,
  columnId: string,
): boolean {
  const semantic = boardColumns?.find((c) => c.id === columnId)?.semantic;
  if (semantic != null) return semantic !== 'backlog' && semantic !== 'next_up';
  return columnId !== 'backlog' && columnId !== 'next_up';
}

export function laneDisplayLabel(raw: string | null): string | null {
  if (!raw) return null;
  if ((Object.keys(ORCHESTRATION_LANE_LABELS) as string[]).includes(raw)) {
    return ORCHESTRATION_LANE_LABELS[raw as OrchestrationLaneId];
  }
  return raw.replaceAll('_', ' ');
}

export function formatLaneDensityLine(
  ids: readonly string[],
  cardsById: Map<string, PlanBoardCardDto>,
): string | null {
  const counts = new Map<string, number>();
  for (const id of ids) {
    const lane = cardsById.get(id)?.lane;
    if (!lane) continue;
    counts.set(lane, (counts.get(lane) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const parts = [...counts.entries()].map(([lane, n]) => {
    const label = laneDisplayLabel(lane);
    return `${n} ${label ?? lane}`;
  });
  return `${PLAN_BOARD_COPY.columnLaneMixLabel}: ${parts.join(', ')}`;
}

export function isBacklogOperationalColumn(
  boardColumns: PlanBoardGetBody['columns'] | undefined,
  columnId: string,
): boolean {
  const semantic = boardColumns?.find((c) => c.id === columnId)?.semantic;
  if (semantic != null) return semantic === 'backlog';
  return columnId === 'backlog';
}
