/**
 * Client-side workflow guardrails for operational board columns.
 * Hard limits/automation stay server-authoritative; this policy is a UX hint layer.
 */
export const PLAN_BOARD_WORKFLOW_POLICY = {
  wipLimitsBySemanticColumn: {
    in_progress: 6,
    review: 4,
  },
} as const;

export function resolvePlanBoardWipLimit(columnId: string): number | null {
  if (columnId === 'in_progress') return PLAN_BOARD_WORKFLOW_POLICY.wipLimitsBySemanticColumn.in_progress;
  if (columnId === 'review') return PLAN_BOARD_WORKFLOW_POLICY.wipLimitsBySemanticColumn.review;
  return null;
}
