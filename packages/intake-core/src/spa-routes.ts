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
  adminSnapshots: 'admin/snapshots',
  adminDiscovery: 'admin/discovery',
  adminIntakeWording: 'admin/intake-wording',
  adminQuestionBankStudio: 'admin/question-bank-studio',
  /** Consultant-only: internal design system index (not linked for clients). */
  adminDesignSystem: 'admin/design-system',
  pipelineById: 'pipeline/:id',
  reportsById: 'reports/:id',
  strategyById: 'strategy/:id',
  settings: 'settings',
  portalAuditNew: 'portal/audit/new',
  portalPipelineById: 'portal/pipeline/:id',
  portalReportsById: 'portal/reports/:id',
  portalStrategyById: 'portal/strategy/:id',
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
