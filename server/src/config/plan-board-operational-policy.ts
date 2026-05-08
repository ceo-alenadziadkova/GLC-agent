import type { GlcOrchestrationPack } from '../schemas/glc-orchestration-pack.js';
import type { PlanBoardSemanticKey } from './plan-board-semantics.js';

/**
 * When true, Delivery Board must stay read-only for operational mutations (PATCH columns, manual add, reconcile POST).
 * Mirrors narrative Timeline `status === 'degraded'` (pack `input_quality.degraded`).
 */
export function isPlanBoardOperationalReadOnlyPack(pack: GlcOrchestrationPack): boolean {
  return pack.input_quality?.degraded === true;
}

/**
 * ADR appendix §2.3 strict variant — manual backlog rows (`source === 'manual'`) may not enter the **in_progress** semantic column
 * until product enables an explicit promotion path into the pack graph. Wired behind
 * `isPlanBoardStrictManualInProgressBlocked()` in `server/src/config/feature-flags.ts`; shipped default is **strict on** (product §2.3); set env `FEATURE_PLAN_BOARD_STRICT_MANUAL_IN_PROGRESS=false` to relax.
 *
 * Applies to column changes only: moving within **in_progress** (position/pin) or exiting **in_progress** stays allowed.
 */
export function shouldBlockManualCardEnteringOperationalInProgress(args: {
  strictEnabled: boolean;
  source: string;
  requestedToSemantic?: PlanBoardSemanticKey | null | undefined;
  currentSemantic?: PlanBoardSemanticKey | null | undefined;
}): boolean {
  if (!args.strictEnabled) return false;
  if (args.source !== 'manual') return false;
  const to = args.requestedToSemantic;
  if (to == null || to !== 'in_progress') return false;
  if (args.currentSemantic === 'in_progress') return false;
  return true;
}
