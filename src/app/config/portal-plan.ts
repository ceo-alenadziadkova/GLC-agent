/**
 * Unified Plan workspace (roadmap Gantt vs delivery board vs table) under `/plan/:id` and `/portal/plan/:id`.
 * Legacy `/roadmap/:id` and `/timeline/:id` paths redirect to canonical plan URLs (`LegacyPlanPathRedirect`).
 * Legacy `?view=timeline` is treated as redirect-only input and normalized to canonical execute views.
 */
import { APP_FEATURE_FLAGS, type FeatureRolloutMode } from './app-feature-flags';

export const PORTAL_PLAN_VIEW_QUERY_KEY = 'view' as const;

export type PortalPlanViewParam = 'roadmap' | 'board' | 'table';

/** Default `view` when the query string omits `view` — board after Delivery Board rollout reaches `ga` (ADR Delivery Board). */
export function defaultPortalPlanSurfaceFromRollout(mode: FeatureRolloutMode): PortalPlanViewParam {
  return mode === 'ga' ? 'board' : 'roadmap';
}

export function defaultPortalPlanViewWhenQueryMissing(): PortalPlanViewParam {
  return defaultPortalPlanSurfaceFromRollout(APP_FEATURE_FLAGS.planDeliveryBoardRolloutMode);
}

export function parsePortalPlanViewParam(raw: string | null): PortalPlanViewParam {
  if (raw == null || String(raw).trim() === '') {
    return defaultPortalPlanViewWhenQueryMissing();
  }
  const t = String(raw).trim();
  if (t === 'roadmap' || t === 'Roadmap') return 'roadmap';
  if (t === 'board' || t === 'Board') return 'board';
  if (t === 'table' || t === 'Table') return 'table';
  /** Legacy narrative tab URL — treated as board when board rollout is active, else roadmap. */
  if (t === 'timeline' || t === 'Timeline') {
    return defaultPortalPlanSurfaceFromRollout(APP_FEATURE_FLAGS.planDeliveryBoardRolloutMode) === 'board'
      ? 'board'
      : 'roadmap';
  }
  return 'board';
}
