/**
 * Marketing brief route labels and client-side preview (same rules as `@glc/intake-core`).
 * `POST /api/marketing/brief` response is authoritative after submit.
 */

import {
  computeMarketingBriefRecommendedRoute,
  MARKETING_BRIEF_ROUTE_LABELS_EN,
  type MarketingBriefRoutingInput,
  type MarketingBriefRoute,
} from '@glc/intake-core';

export type MarketingRecommendedRoute = MarketingBriefRoute;

export function computeMarketingRecommendedRoute(input: MarketingBriefRoutingInput): MarketingRecommendedRoute {
  return computeMarketingBriefRecommendedRoute(input);
}

/** English route labels from the same source as `@glc/intake-core` marketing brief UI copy. */
export const ROUTE_LABELS: Record<MarketingRecommendedRoute, string> = MARKETING_BRIEF_ROUTE_LABELS_EN;
