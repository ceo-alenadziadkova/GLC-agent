/** Mirrors server logic for optimistic UI; server response is authoritative. */

export type MarketingRecommendedRoute = '/snapshot' | '/express-audit' | '/audit' | '/discovery';

export function computeMarketingRecommendedRoute(input: {
  unsure_choice: boolean;
  no_website: boolean;
  urgency: string;
}): MarketingRecommendedRoute {
  if (input.unsure_choice) return '/snapshot';
  if (input.no_website) return '/discovery';
  const u = input.urgency.toLowerCase();
  if (u.includes('urgent') || u.includes('2 weeks') || u.includes('two weeks')) {
    return '/express-audit';
  }
  return '/audit';
}

export const ROUTE_LABELS: Record<MarketingRecommendedRoute, string> = {
  '/snapshot': 'Snapshot — quick check',
  '/express-audit': 'Express audit',
  '/audit': 'Full audit',
  '/discovery': 'Discovery',
};
