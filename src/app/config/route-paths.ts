import { APP_ROUTE_SEGMENTS as P, SPA_ROUTE_SEGMENTS as R } from '@glc/intake-core';

export const APP_ROUTE_PATHS = {
  home: '/',
  login: `/${P.login}`,
  snapshot: `/${R.snapshot}`,
  discovery: '/discovery',
  brief: `/${P.brief}`,
  faq: `/${P.faq}`,
  dashboard: `/${P.dashboard}`,
  portfolio: `/${P.portfolio}`,
  portal: `/${P.portal}`,
  settings: `/${P.settings}`,
  adminRequests: `/${P.adminRequests}`,
  adminSnapshots: `/${P.adminSnapshots}`,
  adminDiscovery: `/${P.adminDiscovery}`,
  auditNew: `/${P.auditNew}`,
  portalAuditNew: `/${P.portalAuditNew}`,
  starterPackage: `/${R.starterPackage}`,
  proPackage: `/${R.proPackage}`,
  completePackage: `/${R.completePackage}`,
} as const;

export const buildAppRoute = {
  audit: (auditId: string): string => `/${P.auditById.replace(':id', auditId)}`,
  pipeline: (auditId: string): string => `/${P.pipelineById.replace(':id', auditId)}`,
  reports: (auditId: string): string => `/${P.reportsById.replace(':id', auditId)}`,
  strategy: (auditId: string): string => `/${P.strategyById.replace(':id', auditId)}`,
  portalAudit: (auditId: string): string => `/${P.portalAuditById.replace(':id', auditId)}`,
  portalPipeline: (auditId: string): string => `/${P.portalPipelineById.replace(':id', auditId)}`,
  loginWithDiscovery: (token: string): string => `${APP_ROUTE_PATHS.login}?discovery=${encodeURIComponent(token)}`,
  auditNewFromDiscovery: (): string => `${APP_ROUTE_PATHS.auditNew}?from_discovery=1`,
  /** Public intake token prefill for consultant New Audit wizard (`useNewAuditWizard` reads `intake`). */
  auditNewWithIntakeToken: (token: string): string =>
    `${APP_ROUTE_PATHS.auditNew}?intake=${encodeURIComponent(token)}`,
  loginWithHashAndSearch: (search: string, hash: string): string => `${APP_ROUTE_PATHS.login}${search}${hash}`,
  loginWithNext: (nextPath: string): string =>
    `${APP_ROUTE_PATHS.login}?next=${encodeURIComponent(nextPath)}`,
} as const;

const UUID_SEGMENT_PATTERN = '[a-f0-9-]+';
const MAIN_AUDIT_PREFIXES = ['audit', 'pipeline', 'reports', 'strategy'].join('|');
const PORTAL_AUDIT_PREFIXES = ['audit', 'pipeline'].join('|');

export const APP_ROUTE_PATTERNS = {
  mainAuditScope: new RegExp(`^/(?:${MAIN_AUDIT_PREFIXES})/(${UUID_SEGMENT_PATTERN})`),
  portalAuditScope: new RegExp(`^/portal/(?:${PORTAL_AUDIT_PREFIXES})/(${UUID_SEGMENT_PATTERN})`),
  auditById: /^\/audit\/[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}/i,
} as const;
