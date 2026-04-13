/**
 * SPA path segments and marketing-brief paths — single source for React Router
 * and `computeMarketingBriefRecommendedRoute` (avoid drift vs `routes.tsx`).
 */

export const SPA_ROUTE_SEGMENTS = {
  snapshot: 'snapshot',
  expressAudit: 'express-audit',
  fullAudit: 'audit',
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
  pipelineById: 'pipeline/:id',
  reportsById: 'reports/:id',
  strategyById: 'strategy/:id',
  settings: 'settings',
  portalAuditNew: 'portal/audit/new',
  portalPipelineById: 'portal/pipeline/:id',
  portalReportsById: 'portal/reports/:id',
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
  expressAudit: absPath(SPA_ROUTE_SEGMENTS.expressAudit),
  fullAudit: absPath(SPA_ROUTE_SEGMENTS.fullAudit),
  discovery: absPath(SPA_ROUTE_SEGMENTS.discovery),
} as const;

export const MARKETING_BRIEF_ALLOWED_ROUTES = [
  SPA_MARKETING_BRIEF_PATHS.snapshot,
  SPA_MARKETING_BRIEF_PATHS.expressAudit,
  SPA_MARKETING_BRIEF_PATHS.fullAudit,
  SPA_MARKETING_BRIEF_PATHS.discovery,
] as const;
