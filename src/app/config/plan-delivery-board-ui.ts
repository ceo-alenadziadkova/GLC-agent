import { APP_FEATURE_FLAGS } from './app-feature-flags';
import type { PortalPlanViewParam } from './portal-plan';

/**
 * Canonical `view=` for Strategy Lab → Plan CTAs (explicit links).
 * Prefer Delivery Board when the surface is rolled out; otherwise the Gantt Roadmap schedule.
 */
export function primaryPlanWorkbenchViewForStrategyLinks(): PortalPlanViewParam {
  if (isPlanDeliveryBoardUiEnabled()) return 'board';
  return 'roadmap';
}

const ROLLOUT_ORDER = ['shadow', 'internal', 'pilot', 'ga'] as const;

function rolloutIndex(mode: (typeof ROLLOUT_ORDER)[number]): number {
  return ROLLOUT_ORDER.indexOf(mode);
}

/** Board tab and read-only / interactive Board surfaces (client static config). */
export function isPlanDeliveryBoardUiEnabled(): boolean {
  return rolloutIndex(APP_FEATURE_FLAGS.planDeliveryBoardRolloutMode) >= rolloutIndex('internal');
}

/**
 * Whether `useOrchestrationReadModel` should issue `GET /api/audits/:id/timeline` for the unified Plan shell.
 * When deferred on the Board tab, Board uses `timeline_parity` from `GET …/plan/board` only.
 */
export function planOrchestrationIncludeTimelineForUnifiedPlanView(activeView: PortalPlanViewParam): boolean {
  if (!APP_FEATURE_FLAGS.planBoardDeferTimelineFetchOnBoardTabEnabled) return true;
  return activeView !== 'board';
}
