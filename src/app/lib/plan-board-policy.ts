import { isPlanBoardDrawerMoveAllowed } from '../config/plan-board-transitions';
import type { PlanBoardUiColumnId } from '../config/plan-board-ui-columns';

export type PlanBoardActorRole = 'consultant' | 'client';

/**
 * Shared policy facade for cross-surface Delivery Board interactions.
 */
export function canEditPlanBoardCardFields(args: {
  role: PlanBoardActorRole;
  governanceReadOnly: boolean;
}): boolean {
  if (args.governanceReadOnly) return false;
  return args.role === 'consultant';
}

export function canMovePlanBoardCardColumn(args: {
  role: PlanBoardActorRole;
  governanceReadOnly: boolean;
  from: PlanBoardUiColumnId;
  to: PlanBoardUiColumnId;
}): boolean {
  if (args.governanceReadOnly) return false;
  return isPlanBoardDrawerMoveAllowed(args.role, args.from, args.to);
}
