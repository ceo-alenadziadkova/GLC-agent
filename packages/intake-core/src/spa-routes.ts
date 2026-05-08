/**
 * SPA path segments and marketing-brief paths — single source for React Router
 * and `computeMarketingBriefRecommendedRoute` (avoid drift vs `routes.tsx`).
 */

export const SPA_ROUTE_SEGMENTS = {
  snapshot: 'snapshot',
  starterPackage: 'starter',
  proPackage: 'pro',
  completePackage: 'complete',
  discovery: 'discovery',
} as const;

/**
 * Nested path segments under `plan/:id` and `portal/plan/:id` (delivery only: board / roadmap / table).
 * Strategy Lab studio is canonical at `/lab/:id` and `/portal/lab/:id`; `studio` remains for legacy
 * `/plan/:id/studio` redirects. Keep in sync with React Router children and `buildAppRoute.plan` / `plan-cross-nav`.
 */
export const PLAN_WORKSPACE_SURFACE_SEGMENTS = {
  /** Legacy segment; router redirects to `/lab/:id` (consultant) or `/portal/lab/:id` (portal). */
  studio: 'studio',
  board: 'board',
  roadmap: 'roadmap',
  table: 'table',
} as const;

export type PlanWorkspaceSurfacePathSegment = keyof typeof PLAN_WORKSPACE_SURFACE_SEGMENTS;

/**
 * Remaining React Router `path` strings (consultant, client, public).
 * Keeps deep links and nav in sync with the SPA root router.
 */
export const APP_ROUTE_SEGMENTS = {
  login: 'login',
  brief: 'brief',
  faq: 'faq',
  intakeToken: 'intake/:token',
  /** Legacy alias; same page as `SPA_ROUTE_SEGMENTS.discovery`. */
  discoveryPublicLegacy: 'audit/discover',
  auditNew: 'audit/new',
  auditByDomain: 'audit/:id/:domainId',
  auditById: 'audit/:id',
  dashboard: 'dashboard',
  portfolio: 'portfolio',
  adminRequests: 'admin/requests',
  adminAudits: 'admin/audits',
  adminSnapshots: 'admin/snapshots',
  adminDiscovery: 'admin/discovery',
  adminIntakeWording: 'admin/intake-wording',
  adminQuestionBankStudio: 'admin/question-bank-studio',
  /** Consultant-only: internal design system index (not linked for clients). */
  adminDesignSystem: 'admin/design-system',
  pipelineById: 'pipeline/:id',
  /** Legacy alias; router canonicalizes to nested `plan/:id/board` (or rollout fallback). */
  timelineById: 'timeline/:id',
  /** Legacy; router redirects to `plan/:id`. */
  roadmapById: 'roadmap/:id',
  /** Parent layout for nested plan workspace (`board` / `roadmap` / `table`; legacy `studio` redirects to `lab`). */
  planById: 'plan/:id',
  /** Strategy Lab studio (consultant); `?mode=define|shape`. */
  labById: 'lab/:id',
  reportsById: 'reports/:id',
  strategyById: 'strategy/:id',
  /** Consultant-only orchestration cockpit (read model + governance). */
  auditOrchestrationById: 'audit/:id/orchestration',
  settings: 'settings',
  portalAuditNew: 'portal/audit/new',
  portalPipelineById: 'portal/pipeline/:id',
  portalReportsById: 'portal/reports/:id',
  /** Legacy alias; router canonicalizes to nested `portal/plan/:id/...` delivery paths. */
  portalTimelineById: 'portal/timeline/:id',
  /** Legacy; redirects to nested `portal/plan/:id/...`. */
  portalRoadmapById: 'portal/roadmap/:id',
  /** Client plan workspace parent (`board` / `roadmap` / `table`; legacy `studio` redirects to `portal/lab`). */
  portalPlanById: 'portal/plan/:id',
  /** Strategy Lab studio (client portal); `?mode=define|shape`. */
  portalLabById: 'portal/lab/:id',
  portalStrategyById: 'portal/strategy/:id',
  /** Client manifest-first wizard (V2): guided roadmap inputs before pack build. */
  portalRoadmapManifestByAuditId: 'portal/audit/:id/roadmap-manifest',
  portalAuditById: 'portal/audit/:id',
  portal: 'portal',
} as const;

export type SpaMarketingBriefSegmentKey = keyof typeof SPA_ROUTE_SEGMENTS;

function absPath(segment: string): `/${string}` {
  return `/${segment}`;
}

/** Full paths returned by marketing brief routing (leading slash). */
export const SPA_MARKETING_BRIEF_PATHS = {
  snapshot: absPath(SPA_ROUTE_SEGMENTS.snapshot),
  starterPackage: absPath(SPA_ROUTE_SEGMENTS.starterPackage),
  proPackage: absPath(SPA_ROUTE_SEGMENTS.proPackage),
  completePackage: absPath(SPA_ROUTE_SEGMENTS.completePackage),
  discovery: absPath(SPA_ROUTE_SEGMENTS.discovery),
} as const;

export const MARKETING_BRIEF_ALLOWED_ROUTES = [
  SPA_MARKETING_BRIEF_PATHS.snapshot,
  SPA_MARKETING_BRIEF_PATHS.starterPackage,
  SPA_MARKETING_BRIEF_PATHS.proPackage,
  SPA_MARKETING_BRIEF_PATHS.completePackage,
  SPA_MARKETING_BRIEF_PATHS.discovery,
] as const;
