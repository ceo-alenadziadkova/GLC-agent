import { Navigate, useLocation, useParams } from 'react-router';

import { APP_ROUTE_PATHS, buildAppRoute } from '../../config/route-paths';

/**
 * Redirects legacy `/plan/:id/studio` and `/portal/plan/:id/studio` to canonical `/lab/:id` and `/portal/lab/:id`
 * preserving query and hash.
 */
export function PlanStudioToLabRedirect() {
  const { id } = useParams<{ id: string }>();
  const { pathname, search, hash } = useLocation();
  const isClient = pathname.startsWith('/portal/');

  if (!id) {
    return <Navigate to={isClient ? APP_ROUTE_PATHS.portal : APP_ROUTE_PATHS.dashboard} replace />;
  }

  const target = isClient ? buildAppRoute.portalPlanStudio(id) : buildAppRoute.planStudio(id);
  return <Navigate to={`${target}${search}${hash}`} replace />;
}
