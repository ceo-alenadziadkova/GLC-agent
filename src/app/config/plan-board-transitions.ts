/**
 * Allowed Delivery Board column moves per role — mirrors server `server/src/config/plan-board-transitions.ts`
 * as SPA affordances only (authorization remains server-validated).
 */

import type { PlanBoardUiColumnId } from './plan-board-ui-columns';

export const PLAN_BOARD_CLIENT_ALLOWED_TRANSITIONS: ReadonlyArray<`${PlanBoardUiColumnId}->${PlanBoardUiColumnId}`> = [
  'next_up->in_progress',
  'in_progress->next_up',
  'in_progress->review',
  'review->done',
];

/** Whether `to` may be selected from the Roadmap drawer move menu given current column (`from`). */
export function isPlanBoardDrawerMoveAllowed(role: 'consultant' | 'client', from: PlanBoardUiColumnId, to: PlanBoardUiColumnId): boolean {
  if (from === to) return false;
  if (role === 'consultant') return true;
  const key = `${from}->${to}` as (typeof PLAN_BOARD_CLIENT_ALLOWED_TRANSITIONS)[number];
  return PLAN_BOARD_CLIENT_ALLOWED_TRANSITIONS.includes(key);
}
