import type { GlcOrchestrationPack } from '../schemas/glc-orchestration-pack.js';
import type { PlanBoardColumnId } from './plan-board-columns.js';

/**
 * When true, Delivery Board must stay read-only for operational mutations (PATCH columns, manual add, reconcile POST).
 * Mirrors narrative Timeline `status === 'degraded'` (pack `input_quality.degraded`).
 */
export function isPlanBoardOperationalReadOnlyPack(pack: GlcOrchestrationPack): boolean {
  return pack.input_quality?.degraded === true;
}

/**
 * ADR appendix §2.3 strict variant — manual backlog rows (`source === 'manual'`) may not enter the **in_progress** column
 * until product enables an explicit promotion path into the pack graph. Wired behind
 * `isPlanBoardStrictManualInProgressBlocked()` in `server/src/config/feature-flags.ts`; default preserves legacy tolerant behavior.
 *
 * Applies to column changes only: moving within **in_progress** (position/pin) or exiting **in_progress** stays allowed.
 */
export function shouldBlockManualCardEnteringOperationalInProgress(args: {
  strictEnabled: boolean;
  source: string;
  currentColumnId: PlanBoardColumnId;
  requestedToColumn?: PlanBoardColumnId | undefined;
}): boolean {
  if (!args.strictEnabled) return false;
  if (args.source !== 'manual') return false;
  const to = args.requestedToColumn;
  if (to == null || to !== 'in_progress') return false;
  if (args.currentColumnId === 'in_progress') return false;
  return true;
}
