import type { PlanBoardColumnId } from './plan-board-columns.js';

/** Client role: constrained column moves (consultant unrestricted for MVP reconcile of ADR backlog). */
export const PLAN_BOARD_CLIENT_ALLOWED_TRANSITIONS: ReadonlyArray<`${PlanBoardColumnId}->${PlanBoardColumnId}`> = [
  'next_up->in_progress',
  'in_progress->next_up',
  'in_progress->review',
  'review->done',
];

export function parsePlanBoardTransition(
  role: 'consultant' | 'client',
  from: PlanBoardColumnId,
  to: PlanBoardColumnId,
): boolean {
  if (from === to) return true;
  if (role === 'consultant') return true;
  const key = `${from}->${to}` as const;
  return PLAN_BOARD_CLIENT_ALLOWED_TRANSITIONS.includes(key);
}
