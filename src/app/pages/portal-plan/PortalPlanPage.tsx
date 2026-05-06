import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';

import { APP_ROUTE_PATHS } from '../../config/route-paths';
import { PORTAL_PLAN_VIEW_QUERY_KEY, parsePortalPlanViewParam } from '../../config/portal-plan';
import {
  isPlanDeliveryBoardUiEnabled,
  planOrchestrationIncludeTimelineForUnifiedPlanView,
} from '../../config/plan-delivery-board-ui';
import { useProfile } from '../../hooks/useProfile';
import { PortalRoadmapGanttSurface } from '../PortalRoadmapGanttPage';
import { PortalDeliveryBoardSurface } from './board/BoardView';
import { PortalPlanOrchestrationProvider } from './PortalPlanOrchestrationProvider';
import { PortalPlanUnifiedShellCoordinator } from './PortalPlanUnifiedShell';
import type { PlanSurfaceBranch } from './PortalPlanUnifiedShell';

/**
 * Single entry for canonical Plan URLs (`/plan/:id`, `/portal/plan/:id`).
 * Tabs: `board` (default when Board rollout is `ga`), `roadmap`; legacy `?view=timeline` collapses to Board (or Roadmap without Board rollout).
 * Shared orchestration queries stay mounted across tab switches.
 */
export function PortalPlanPage() {
  const { id } = useParams<{ id: string }>();
  const { isClient } = useProfile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const boardRollout = isPlanDeliveryBoardUiEnabled();

  const view: PlanSurfaceBranch = useMemo(() => {
    const v = parsePortalPlanViewParam(searchParams.get(PORTAL_PLAN_VIEW_QUERY_KEY));
    if (!boardRollout && (v === 'board' || v === 'timeline')) return 'roadmap';
    if (boardRollout && v === 'timeline') return 'board';
    return v;
  }, [boardRollout, searchParams]);

  useEffect(() => {
    const raw = searchParams.get(PORTAL_PLAN_VIEW_QUERY_KEY);
    const parsed = parsePortalPlanViewParam(raw);
    if (!boardRollout && (parsed === 'board' || parsed === 'timeline')) {
      navigate({ search: `?${PORTAL_PLAN_VIEW_QUERY_KEY}=roadmap` }, { replace: true });
      return;
    }
    if (boardRollout && parsed === 'timeline') {
      navigate({ search: `?${PORTAL_PLAN_VIEW_QUERY_KEY}=board` }, { replace: true });
    }
  }, [boardRollout, navigate, searchParams]);

  const roadmapActive = view === 'roadmap';
  const boardActive = view === 'board';

  const [mountedRoadmap, setMountedRoadmap] = useState(roadmapActive);
  const [mountedBoard, setMountedBoard] = useState(boardActive);

  useEffect(() => {
    if (roadmapActive) setMountedRoadmap(true);
  }, [roadmapActive]);

  useEffect(() => {
    if (boardActive) setMountedBoard(true);
  }, [boardActive]);

  const orchestrationIncludeTimeline = planOrchestrationIncludeTimelineForUnifiedPlanView(view);

  if (!id) {
    return <Navigate to={isClient ? APP_ROUTE_PATHS.portal : APP_ROUTE_PATHS.dashboard} replace />;
  }

  return (
    <PortalPlanOrchestrationProvider auditId={id} includeTimeline={orchestrationIncludeTimeline}>
      <PortalPlanUnifiedShellCoordinator activeView={view}>
        {mountedBoard ? (
          <div
            hidden={!boardActive}
            {...(!boardActive ? { inert: '' as const } : {})}
            data-testid="portal-plan-board-panel"
          >
            <PortalDeliveryBoardSurface unifiedShellTabActive={boardActive} />
          </div>
        ) : null}
        {mountedRoadmap ? (
          <div
            hidden={!roadmapActive}
            {...(!roadmapActive ? { inert: '' as const } : {})}
            data-testid="portal-plan-roadmap-panel"
          >
            <PortalRoadmapGanttSurface unifiedShellTabActive={roadmapActive} />
          </div>
        ) : null}
      </PortalPlanUnifiedShellCoordinator>
    </PortalPlanOrchestrationProvider>
  );
}
