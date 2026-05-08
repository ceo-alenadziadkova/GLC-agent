import type { PlanBoardSemanticKey } from './plan-board-semantics.js';

/** Client role: constrained column moves by semantic (consultant unrestricted for MVP reconcile of ADR backlog). */
export const PLAN_BOARD_CLIENT_ALLOWED_SEMANTIC_TRANSITIONS: ReadonlyArray<
  `${PlanBoardSemanticKey}->${PlanBoardSemanticKey}`
> = ['next_up->in_progress', 'in_progress->next_up', 'in_progress->review', 'review->done'];

export function parsePlanBoardTransitionBySemantics(
  role: 'consultant' | 'client',
  from: PlanBoardSemanticKey | null,
  to: PlanBoardSemanticKey | null,
): boolean {
  if (from == null || to == null) return false;
  if (from === to) return true;
  if (role === 'consultant') return true;
  const key = `${from}->${to}` as const;
  return PLAN_BOARD_CLIENT_ALLOWED_SEMANTIC_TRANSITIONS.includes(key);
}
