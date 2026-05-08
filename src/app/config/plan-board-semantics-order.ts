/**
 * Ordered semantic roles for persisted column policy (`plan_board_column_policy`).
 * Mirrors server `PLAN_BOARD_SEMANTIC_KEYS`; keep aligned with ADR Epic 3.
 */
export const PLAN_BOARD_SEMANTIC_ORDER = [
  'backlog',
  'next_up',
  'in_progress',
  'review',
  'done',
  'blocked',
] as const;

export type PlanBoardSemanticRole = (typeof PLAN_BOARD_SEMANTIC_ORDER)[number];
