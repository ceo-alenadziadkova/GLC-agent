import { APP_FEATURE_FLAGS } from './app-feature-flags';
import type { PortalPlanViewParam } from './portal-plan';

const ROLLOUT_ORDER = ['shadow', 'internal', 'pilot', 'ga'] as const;

function rolloutIndex(mode: (typeof ROLLOUT_ORDER)[number]): number {
  return ROLLOUT_ORDER.indexOf(mode);
}

/** Board tab and read-only / interactive Board surfaces (client static config). */
export function isPlanDeliveryBoardUiEnabled(): boolean {
  return rolloutIndex(APP_FEATURE_FLAGS.planDeliveryBoardRolloutMode) >= rolloutIndex('internal');
}

/** Narrative Timeline tab remains available until parity + explicit sunset (P3). */
export function isPlanNarrativeTimelineUiEnabled(): boolean {
  return APP_FEATURE_FLAGS.planNarrativeTimelineEnabled;
}

/**
 * Whether `useOrchestrationReadModel` should issue `GET /api/audits/:id/timeline` for the unified Plan shell.
 * When deferred on the Board tab, Board uses `timeline_parity` from `GET …/plan/board` only.
 */
export function planOrchestrationIncludeTimelineForUnifiedPlanView(activeView: PortalPlanViewParam): boolean {
  if (!APP_FEATURE_FLAGS.planBoardDeferTimelineFetchOnBoardTabEnabled) return true;
  return activeView !== 'board';
}
