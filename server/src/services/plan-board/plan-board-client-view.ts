import type { PlanBoardColumnId } from '../../config/plan-board-columns.js';

/** Portal client may only see workflow columns (ADR §10); no backlog, blocked, or archived. */
export const PLAN_BOARD_CLIENT_VISIBLE_COLUMN_IDS = new Set<PlanBoardColumnId>([
  'next_up',
  'in_progress',
  'review',
  'done',
]);

export type PlanBoardCardRowLike = {
  source: string;
  column_id: string;
  delivery_area: string;
};

export function filterPlanBoardCardsForClientView<T extends PlanBoardCardRowLike>(cards: readonly T[]): T[] {
  return cards.filter(
    (c) =>
      c.source === 'pack' &&
      c.delivery_area !== 'archived' &&
      PLAN_BOARD_CLIENT_VISIBLE_COLUMN_IDS.has(c.column_id as PlanBoardColumnId),
  );
}

export function isPlanBoardCardRowVisibleToClient(row: PlanBoardCardRowLike): boolean {
  return filterPlanBoardCardsForClientView([row]).length > 0;
}
