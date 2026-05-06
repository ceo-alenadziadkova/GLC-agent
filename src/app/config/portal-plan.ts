/**
 * Unified Plan surface (roadmap Gantt vs seasonal timeline vs delivery board) under `/plan/:id` and `/portal/plan/:id`.
 * Legacy `/roadmap/:id` and `/timeline/:id` paths redirect to canonical plan URLs (`LegacyPlanPathRedirect`).
 */
import { APP_FEATURE_FLAGS, type FeatureRolloutMode } from './app-feature-flags';

export const PORTAL_PLAN_VIEW_QUERY_KEY = 'view' as const;

export type PortalPlanViewParam = 'roadmap' | 'timeline' | 'board';

/** Default `view` when the query string omits `view` — board after Delivery Board rollout reaches `ga` (ADR Delivery Board). */
export function defaultPortalPlanSurfaceFromRollout(mode: FeatureRolloutMode): PortalPlanViewParam {
  return mode === 'ga' ? 'board' : 'timeline';
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
  if (t === 'timeline' || t === 'Timeline') return 'timeline';
  return 'timeline';
}
