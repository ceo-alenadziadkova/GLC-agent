import { Navigate, useParams, useSearchParams } from 'react-router';

import { APP_ROUTE_PATHS, buildAppRoute } from '../../config/route-paths';
import { PORTAL_PLAN_VIEW_QUERY_KEY, parsePortalPlanViewParam } from '../../config/portal-plan';
import { PLAN_WORKSPACE_MODE_QUERY_KEY, parsePlanWorkspaceModeParam } from '../../config/plan-workspace-mode';
import { isPlanDeliveryBoardUiEnabled } from '../../config/plan-delivery-board-ui';
import { useProfile } from '../../hooks/useProfile';

/**
 * Normalizes `/plan/:id` and `/portal/plan/:id` (index) to path-first delivery or `/lab/:id` (studio) URLs.
 */
export function PlanWorkspaceIndexRedirect() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { isClient } = useProfile();

  if (!id) {
    return <Navigate to={isClient ? APP_ROUTE_PATHS.portal : APP_ROUTE_PATHS.dashboard} replace />;
  }

  const modeRaw = searchParams.get(PLAN_WORKSPACE_MODE_QUERY_KEY);
  if (modeRaw != null && String(modeRaw).trim() !== '') {
    const parsed = parsePlanWorkspaceModeParam(modeRaw);
    if (parsed === 'define' || parsed === 'shape') {
      const preserved = new URLSearchParams(searchParams);
      preserved.delete(PORTAL_PLAN_VIEW_QUERY_KEY);
      preserved.set(PLAN_WORKSPACE_MODE_QUERY_KEY, parsed);
      const qs = preserved.toString();
      const base = isClient ? buildAppRoute.portalPlanStudio(id) : buildAppRoute.planStudio(id);
      return <Navigate to={qs ? `${base}?${qs}` : base} replace />;
    }
  }

  const boardRollout = isPlanDeliveryBoardUiEnabled();
  let view = parsePortalPlanViewParam(searchParams.get(PORTAL_PLAN_VIEW_QUERY_KEY));
  if (!boardRollout && (view === 'board' || view === 'table')) {
    view = 'roadmap';
  }

  const preserved = new URLSearchParams(searchParams);
  preserved.delete(PORTAL_PLAN_VIEW_QUERY_KEY);
  preserved.delete(PLAN_WORKSPACE_MODE_QUERY_KEY);
  const qs = preserved.toString();
  const base = isClient ? buildAppRoute.portalPlan(id, view) : buildAppRoute.plan(id, view);
  return <Navigate to={qs ? `${base}?${qs}` : base} replace />;
}
