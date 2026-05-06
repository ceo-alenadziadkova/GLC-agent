import { LEGAL_DOCUMENT_SPA_ROUTES } from '@glc/api-paths';
import { APP_ROUTE_SEGMENTS as P, SPA_ROUTE_SEGMENTS as R } from '@glc/intake-core';

import { defaultPortalPlanViewWhenQueryMissing, type PortalPlanViewParam } from './portal-plan';

/** Query param for `/audit/new`: load wizard state from a `created` audit (consultant intake not launched). */
export const NEW_AUDIT_RESUME_DRAFT_AUDIT_QUERY = 'draft_audit' as const;

export const APP_ROUTE_PATHS = {
  home: '/',
  login: `/${P.login}`,
  snapshot: `/${R.snapshot}`,
  discovery: '/discovery',
  brief: `/${P.brief}`,
  faq: `/${P.faq}`,
  legalTerms: LEGAL_DOCUMENT_SPA_ROUTES.termsOfService,
  legalPrivacy: LEGAL_DOCUMENT_SPA_ROUTES.privacyPolicy,
  legalDpa: LEGAL_DOCUMENT_SPA_ROUTES.dataProcessingAgreement,
  legalNotice: LEGAL_DOCUMENT_SPA_ROUTES.legalNotice,
  legalCookies: LEGAL_DOCUMENT_SPA_ROUTES.cookiePolicy,
  dashboard: `/${P.dashboard}`,
  portfolio: `/${P.portfolio}`,
  portal: `/${P.portal}`,
  settings: `/${P.settings}`,
  adminRequests: `/${P.adminRequests}`,
  adminAudits: `/${P.adminAudits}`,
  adminSnapshots: `/${P.adminSnapshots}`,
  adminDiscovery: `/${P.adminDiscovery}`,
  adminDesignSystem: `/${P.adminDesignSystem}`,
  auditNew: `/${P.auditNew}`,
  portalAuditNew: `/${P.portalAuditNew}`,
  starterPackage: `/${R.starterPackage}`,
  proPackage: `/${R.proPackage}`,
  completePackage: `/${R.completePackage}`,
} as const;

export const buildAppRoute = {
  audit: (auditId: string): string => `/${P.auditById.replace(':id', auditId)}`,
  pipeline: (auditId: string): string => `/${P.pipelineById.replace(':id', auditId)}`,
  timeline: (auditId: string): string => `/${P.timelineById.replace(':id', auditId)}`,
  roadmap: (auditId: string): string => `/${P.roadmapById.replace(':id', auditId)}`,
  reports: (auditId: string): string => `/${P.reportsById.replace(':id', auditId)}`,
  strategy: (auditId: string): string => `/${P.strategyById.replace(':id', auditId)}`,
  auditOrchestration: (auditId: string): string => `/${P.auditOrchestrationById.replace(':id', auditId)}`,
  portalAudit: (auditId: string): string => `/${P.portalAuditById.replace(':id', auditId)}`,
  portalPipeline: (auditId: string): string => `/${P.portalPipelineById.replace(':id', auditId)}`,
  portalReports: (auditId: string): string => `/${P.portalReportsById.replace(':id', auditId)}`,
  portalTimeline: (auditId: string): string => `/${P.portalTimelineById.replace(':id', auditId)}`,
  portalRoadmap: (auditId: string): string => `/${P.portalRoadmapById.replace(':id', auditId)}`,
  /**
   * Canonical plan URL (`/plan/:id`). Legacy `/roadmap/:id` and `/timeline/:id` redirect here (query merged).
   * Without explicit `view`, defaults follow {@link defaultPortalPlanViewWhenQueryMissing} (board once Delivery Board rollout is `ga`).
   */
  plan: (auditId: string, view?: PortalPlanViewParam): string => {
    const path = `/${P.planById.replace(':id', auditId)}`;
    const resolved = view ?? defaultPortalPlanViewWhenQueryMissing();
    if (resolved === 'roadmap') return `${path}?view=roadmap`;
    if (resolved === 'board') return `${path}?view=board`;
    if (resolved === 'table') return `${path}?view=table`;
    return `${path}?view=board`;
  },
  portalPlan: (auditId: string, view?: PortalPlanViewParam): string => {
    const path = `/${P.portalPlanById.replace(':id', auditId)}`;
    const resolved = view ?? defaultPortalPlanViewWhenQueryMissing();
    if (resolved === 'roadmap') return `${path}?view=roadmap`;
    if (resolved === 'board') return `${path}?view=board`;
    if (resolved === 'table') return `${path}?view=table`;
    return `${path}?view=board`;
  },
  portalStrategy: (auditId: string): string => `/${P.portalStrategyById.replace(':id', auditId)}`,
  portalRoadmapManifest: (auditId: string): string =>
    `/${P.portalRoadmapManifestByAuditId.replace(':id', auditId)}`,
  loginWithDiscovery: (token: string): string => `${APP_ROUTE_PATHS.login}?discovery=${encodeURIComponent(token)}`,
  auditNewFromDiscovery: (): string => `${APP_ROUTE_PATHS.auditNew}?from_discovery=1`,
  /** Public intake token prefill for consultant New Audit wizard (`useNewAuditWizard` reads `intake`). */
  auditNewWithIntakeToken: (token: string): string =>
    `${APP_ROUTE_PATHS.auditNew}?intake=${encodeURIComponent(token)}`,
  auditNewResumeDraft: (auditId: string): string =>
    `${APP_ROUTE_PATHS.auditNew}?${NEW_AUDIT_RESUME_DRAFT_AUDIT_QUERY}=${encodeURIComponent(auditId)}`,
  loginWithHashAndSearch: (search: string, hash: string): string => `${APP_ROUTE_PATHS.login}${search}${hash}`,
  loginWithNext: (nextPath: string): string =>
    `${APP_ROUTE_PATHS.login}?next=${encodeURIComponent(nextPath)}`,
} as const;

const UUID_SEGMENT_PATTERN = '[a-f0-9-]+';
const MAIN_AUDIT_PREFIXES = ['audit', 'pipeline', 'timeline', 'roadmap', 'plan', 'reports', 'strategy'].join('|');
const PORTAL_AUDIT_PREFIXES = ['audit', 'pipeline', 'reports', 'timeline', 'roadmap', 'plan', 'strategy'].join('|');

export const APP_ROUTE_PATTERNS = {
  mainAuditScope: new RegExp(`^/(?:${MAIN_AUDIT_PREFIXES})/(${UUID_SEGMENT_PATTERN})`),
  /** Includes optional `/roadmap-manifest` after portal audit scope (client wizard). */
  portalAuditScope: new RegExp(
    `^/portal/(?:${PORTAL_AUDIT_PREFIXES})/(${UUID_SEGMENT_PATTERN})(?:/roadmap-manifest)?/?$`,
    'i',
  ),
  auditById: /^\/audit\/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/i,
} as const;
