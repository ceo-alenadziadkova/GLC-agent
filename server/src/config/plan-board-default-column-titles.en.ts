import type { PlanBoardSemanticKey } from './plan-board-semantics.js';

/** Default English titles when no per-audit policy is applied (server SSOT for GET `columns`). */
export const PLAN_BOARD_DEFAULT_COLUMN_TITLES_EN: Record<PlanBoardSemanticKey, string> = {
  backlog: 'Backlog',
  next_up: 'Next up',
  in_progress: 'In progress',
  review: 'Review',
  done: 'Done',
  blocked: 'Blocked',
};
