/**
 * Marketing brief → recommended SPA path. Shared by Express and Vite SPA.
 *
 * Rules:
 * - Unsure about format → explore: snapshot if they have a site, discovery if not.
 * - No public site → discovery.
 * - Has site and sure about format → package by `preferred_coverage_package`.
 * - Legacy `preferred_audit_depth` remains mapped for backward compatibility.
 */

import { MARKETING_BRIEF_ALLOWED_ROUTES, SPA_MARKETING_BRIEF_PATHS } from './spa-routes.js';

export { MARKETING_BRIEF_ALLOWED_ROUTES } from './spa-routes.js';
export type MarketingBriefRoute = (typeof MARKETING_BRIEF_ALLOWED_ROUTES)[number];

const ROUTE_SET = new Set<string>(MARKETING_BRIEF_ALLOWED_ROUTES);

export function isAllowedMarketingBriefRoute(r: string): r is MarketingBriefRoute {
  return ROUTE_SET.has(r);
}

export type MarketingBriefPreferredAuditDepth = 'express' | 'full';
export type MarketingBriefPreferredCoveragePackage = 'starter' | 'pro' | 'complete';

export type MarketingBriefRoutingInput = {
  unsure_choice: boolean;
  no_website: boolean;
  preferred_coverage_package?: MarketingBriefPreferredCoveragePackage | null;
  /**
   * When `unsure_choice` or `no_website`, ignored.
   * Legacy fallback when package is absent.
   */
  preferred_audit_depth: MarketingBriefPreferredAuditDepth | null;
};

export function computeMarketingBriefRecommendedRoute(body: MarketingBriefRoutingInput): MarketingBriefRoute {
  if (body.unsure_choice) {
    return body.no_website ? SPA_MARKETING_BRIEF_PATHS.discovery : SPA_MARKETING_BRIEF_PATHS.snapshot;
  }
  if (body.no_website) {
    return SPA_MARKETING_BRIEF_PATHS.discovery;
  }
  if (body.preferred_coverage_package === 'starter') {
    return SPA_MARKETING_BRIEF_PATHS.starterPackage;
  }
  if (body.preferred_coverage_package === 'pro') {
    return SPA_MARKETING_BRIEF_PATHS.proPackage;
  }
  if (body.preferred_coverage_package === 'complete') {
    return SPA_MARKETING_BRIEF_PATHS.completePackage;
  }
  if (body.preferred_audit_depth === 'express') {
    return SPA_MARKETING_BRIEF_PATHS.starterPackage;
  }
  return SPA_MARKETING_BRIEF_PATHS.completePackage;
}
