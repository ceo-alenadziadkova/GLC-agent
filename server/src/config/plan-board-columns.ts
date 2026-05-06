/**
 * Default Delivery Board workflow columns (fixed set until per-audit custom columns ADR).
 */
export const PLAN_BOARD_COLUMN_IDS = [
  'backlog',
  'next_up',
  'in_progress',
  'review',
  'done',
  'blocked',
] as const;

export type PlanBoardColumnId = (typeof PLAN_BOARD_COLUMN_IDS)[number];

export const PLAN_BOARD_COLUMN_DEFAULT_IDS = {
  /** Auto-created cards after pack reconcile land here until moved. */
  backlog: 'backlog',
  next_up: 'next_up',
  in_progress: 'in_progress',
  review: 'review',
  done: 'done',
  blocked: 'blocked',
} as const satisfies Record<string, PlanBoardColumnId>;
