import { Navigate, useLocation, useParams } from 'react-router';

import { APP_ROUTE_PATHS, buildAppRoute } from '../../config/route-paths';

export type LegacyPlanPathRedirectProps = {
  variant: 'consultant' | 'portal';
  surface: 'roadmap' | 'timeline';
};

/** Merges deep-link params (e.g. Gantt toolbar) onto the canonical plan URL. Legacy **`/timeline`** maps to **`view=board`** (narrative tab retired — ADR Delivery Board P3). */
export function canonicalPlanHrefWithLegacySearch(
  canonicalBase: string,
  legacySearch: string,
  surface: 'roadmap' | 'timeline',
): string {
  const qsIdx = canonicalBase.indexOf('?');
  const pathOnly = qsIdx === -1 ? canonicalBase : canonicalBase.slice(0, qsIdx);
  const canonQs = qsIdx === -1 ? '' : canonicalBase.slice(qsIdx + 1);
  const out = new URLSearchParams(canonQs);
  const leg = new URLSearchParams(legacySearch.startsWith('?') ? legacySearch.slice(1) : legacySearch);
  leg.forEach((value, key) => {
    if (key === 'view') return;
    out.set(key, value);
  });
  if (surface === 'timeline') {
    out.set('view', 'board');
  } else {
    out.set('view', 'roadmap');
  }
  const serialized = out.toString();
  return serialized ? `${pathOnly}?${serialized}` : pathOnly;
}

/**
 * Redirects `/roadmap/:id` and `/timeline/:id` (and portal equivalents) to `/plan/:id` with the right `view`.
 */
export function LegacyPlanPathRedirect({ variant, surface }: LegacyPlanPathRedirectProps) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();

  if (!id) {
    return <Navigate to={variant === 'portal' ? APP_ROUTE_PATHS.portal : APP_ROUTE_PATHS.dashboard} replace />;
  }

  const canonicalBase =
    variant === 'portal'
      ? surface === 'timeline'
        ? buildAppRoute.portalPlan(id, 'board')
        : buildAppRoute.portalPlan(id, 'roadmap')
      : surface === 'timeline'
        ? buildAppRoute.plan(id, 'board')
        : buildAppRoute.plan(id, 'roadmap');

  const to = canonicalPlanHrefWithLegacySearch(canonicalBase, location.search ?? '', surface);
  return <Navigate to={to} replace />;
}
