/**
 * Marketing brief → recommended SPA path. Shared by Express and Vite SPA.
 *
 * Rules:
 * - Unsure about format → explore: snapshot if they have a site, discovery if not.
 * - No public site → discovery.
 * - Has site and sure about format → express vs full by **depth** (`preferred_audit_depth`), not timeline/urgency.
 */

import { MARKETING_BRIEF_ALLOWED_ROUTES, SPA_MARKETING_BRIEF_PATHS } from './spa-routes.js';

export { MARKETING_BRIEF_ALLOWED_ROUTES } from './spa-routes.js';
export type MarketingBriefRoute = (typeof MARKETING_BRIEF_ALLOWED_ROUTES)[number];

const ROUTE_SET = new Set<string>(MARKETING_BRIEF_ALLOWED_ROUTES);

export function isAllowedMarketingBriefRoute(r: string): r is MarketingBriefRoute {
  return ROUTE_SET.has(r);
}

export type MarketingBriefPreferredAuditDepth = 'express' | 'full';

export type MarketingBriefRoutingInput = {
  unsure_choice: boolean;
  no_website: boolean;
  /**
   * When `unsure_choice` or `no_website`, ignored.
   * When user has a site and is sure: `express` = lighter-scope path, `full` = maximum depth.
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
  if (body.preferred_audit_depth === 'express') {
    return SPA_MARKETING_BRIEF_PATHS.expressAudit;
  }
  if (body.preferred_audit_depth === 'full') {
    return SPA_MARKETING_BRIEF_PATHS.fullAudit;
  }
  return SPA_MARKETING_BRIEF_PATHS.fullAudit;
}
