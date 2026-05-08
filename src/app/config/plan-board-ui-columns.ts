/**
 * Operational board column order (SPA). Must align with server `plan-board-columns.ts` ids.
 */

export const PLAN_BOARD_UI_COLUMNS = ['backlog', 'next_up', 'in_progress', 'review', 'done', 'blocked'] as const;

export type PlanBoardUiColumnId = (typeof PLAN_BOARD_UI_COLUMNS)[number];

export function isPlanBoardUiColumnId(value: string): value is PlanBoardUiColumnId {
  return (PLAN_BOARD_UI_COLUMNS as readonly string[]).includes(value);
}

/** Short English headings for segmented columns (copy layer). */
export const PLAN_BOARD_COLUMN_HEADINGS_EN: Record<PlanBoardUiColumnId, string> = {
  backlog: 'Backlog',
  next_up: 'Next up',
  in_progress: 'In progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked',
};
