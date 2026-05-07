import { Navigate, Outlet, useParams, useLocation } from 'react-router';

import { PlanCommandPalette } from '../../components/PlanCommandPalette';
import { planOrchestrationIncludeTimelineForUnifiedPlanView } from '../../config/plan-delivery-board-ui';
import { parsePortalPlanViewParam, type PortalPlanViewParam } from '../../config/portal-plan';
import { APP_ROUTE_PATHS } from '../../config/route-paths';
import { useProfile } from '../../hooks/useProfile';
import { PlanCommandRegistryProvider } from '../../context/PlanCommandRegistryContext';
import { PortalPlanOrchestrationProvider } from './PortalPlanOrchestrationProvider';

function planDeliverySurfaceFromPathname(pathname: string): PortalPlanViewParam | null {
  const m = pathname.match(/\/(board|roadmap|table)(?:\/)?$/);
  if (!m?.[1]) return null;
  return parsePortalPlanViewParam(m[1]);
}

/**
 * Shared providers and command palette for nested `/plan/:id/*` and `/portal/plan/:id/*` routes.
 */
export function PlanWorkspaceLayout() {
  const { id } = useParams<{ id: string }>();
  const { pathname } = useLocation();
  const { isClient } = useProfile();

  const deliverySurface = planDeliverySurfaceFromPathname(pathname);
  const includeTimeline =
    deliverySurface != null && planOrchestrationIncludeTimelineForUnifiedPlanView(deliverySurface);

  if (!id) {
    return <Navigate to={isClient ? APP_ROUTE_PATHS.portal : APP_ROUTE_PATHS.dashboard} replace />;
  }

  return (
    <PlanCommandRegistryProvider>
      <PortalPlanOrchestrationProvider auditId={id} includeTimeline={includeTimeline}>
        <PlanCommandPalette />
        <Outlet />
      </PortalPlanOrchestrationProvider>
    </PlanCommandRegistryProvider>
  );
}
