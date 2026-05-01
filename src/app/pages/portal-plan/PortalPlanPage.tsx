import { useEffect, useState } from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router';

import { APP_ROUTE_PATHS } from '../../config/route-paths';
import { PORTAL_PLAN_VIEW_QUERY_KEY, parsePortalPlanViewParam } from '../../config/portal-plan';
import { useProfile } from '../../hooks/useProfile';
import { PortalRoadmapGanttSurface } from '../PortalRoadmapGanttPage';
import { PortalTimelineSurface } from '../PortalTimelinePage';
import { PortalPlanOrchestrationProvider } from './PortalPlanOrchestrationProvider';
import { PortalPlanUnifiedShellCoordinator } from './PortalPlanUnifiedShell';

/**
 * Single entry for canonical Plan URLs (`/plan/:id`, `/portal/plan/:id`).
 * Tab is driven by `view` query (`roadmap` default, `timeline` for seasonal execution).
 * Shared orchestration queries stay mounted across tab switches (no duplicate refetch churn).
 * After a tab has been visited once, roadmap and timeline surfaces stay mounted (`hidden` + `inert`)
 * so in-surface UI state survives subsequent tab toggles without paying the inactive tree on first paint.
 */
export function PortalPlanPage() {
  const { id } = useParams<{ id: string }>();
  const { isClient } = useProfile();
  const [searchParams] = useSearchParams();
  const view = parsePortalPlanViewParam(searchParams.get(PORTAL_PLAN_VIEW_QUERY_KEY));

  const roadmapActive = view === 'roadmap';
  const timelineActive = view === 'timeline';

  const [mountedRoadmap, setMountedRoadmap] = useState(roadmapActive);
  const [mountedTimeline, setMountedTimeline] = useState(timelineActive);

  useEffect(() => {
    if (roadmapActive) setMountedRoadmap(true);
  }, [roadmapActive]);

  useEffect(() => {
    if (timelineActive) setMountedTimeline(true);
  }, [timelineActive]);

  if (!id) {
    return <Navigate to={isClient ? APP_ROUTE_PATHS.portal : APP_ROUTE_PATHS.dashboard} replace />;
  }

  return (
    <PortalPlanOrchestrationProvider auditId={id}>
      <PortalPlanUnifiedShellCoordinator activeView={view}>
        {mountedRoadmap ? (
          <div
            hidden={!roadmapActive}
            {...(!roadmapActive ? { inert: '' as const } : {})}
            data-testid="portal-plan-roadmap-panel"
          >
            <PortalRoadmapGanttSurface unifiedShellTabActive={roadmapActive} />
          </div>
        ) : null}
        {mountedTimeline ? (
          <div
            hidden={!timelineActive}
            {...(!timelineActive ? { inert: '' as const } : {})}
            data-testid="portal-plan-timeline-panel"
          >
            <PortalTimelineSurface unifiedShellTabActive={timelineActive} />
          </div>
        ) : null}
      </PortalPlanUnifiedShellCoordinator>
    </PortalPlanOrchestrationProvider>
  );
}
