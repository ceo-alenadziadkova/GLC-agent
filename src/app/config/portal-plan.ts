/**
 * Unified Plan surface (roadmap Gantt vs seasonal timeline) lives under `/plan/:id` and `/portal/plan/:id`.
 * Legacy `/roadmap/:id` and `/timeline/:id` paths redirect to canonical plan URLs (`LegacyPlanPathRedirect`).
 */
export const PORTAL_PLAN_VIEW_QUERY_KEY = 'view' as const;

export type PortalPlanViewParam = 'roadmap' | 'timeline';

export function parsePortalPlanViewParam(raw: string | null): PortalPlanViewParam {
  if (raw === 'timeline' || raw === 'Timeline') return 'timeline';
  return 'roadmap';
}
