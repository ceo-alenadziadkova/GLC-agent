import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';

import { APP_ROUTE_PATHS } from '../../config/route-paths';
import { PORTAL_PLAN_VIEW_QUERY_KEY, parsePortalPlanViewParam } from '../../config/portal-plan';
import {
  isPlanDeliveryBoardUiEnabled,
  planOrchestrationIncludeTimelineForUnifiedPlanView,
} from '../../config/plan-delivery-board-ui';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import { useProfile } from '../../hooks/useProfile';
import { PortalRoadmapGanttSurface } from '../PortalRoadmapGanttPage';
import { PortalPlanOrchestrationProvider } from './PortalPlanOrchestrationProvider';
import { PortalPlanUnifiedShellCoordinator } from './PortalPlanUnifiedShell';
import type { PlanSurfaceBranch } from './PortalPlanUnifiedShell';

const PortalDeliveryBoardSurfaceLazy = lazy(async () => {
  const m = await import('./board/BoardView');
  return { default: m.PortalDeliveryBoardSurface };
});

const PortalPlanTimelineSurfaceLazy = lazy(async () => {
  const m = await import('./PortalPlanTimelineSurface');
  return { default: m.PortalPlanTimelineSurface };
});

function PlanLazySuspenseFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <p className="text-muted-foreground text-sm">{PLAN_WORKSPACE_UI_COPY.loadingHeadline}</p>
    </div>
  );
}

/**
 * Single entry for canonical Plan URLs (`/plan/:id`, `/portal/plan/:id`).
 * Tabs: Board, Roadmap, optional legacy Timeline (`planUnifiedLegacyTimelineTabEnabled`).
 * Shared orchestration queries stay mounted across tab switches.
 */
export function PortalPlanPage() {
  const { id } = useParams<{ id: string }>();
  const { isClient } = useProfile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const boardRollout = isPlanDeliveryBoardUiEnabled();
  const legacyTimelineTabEnabled = APP_FEATURE_FLAGS.planUnifiedLegacyTimelineTabEnabled;

  const view: PlanSurfaceBranch = useMemo(() => {
    const v = parsePortalPlanViewParam(searchParams.get(PORTAL_PLAN_VIEW_QUERY_KEY));
    if (!boardRollout && (v === 'board' || v === 'timeline')) return 'roadmap';
    if (boardRollout && v === 'timeline' && !legacyTimelineTabEnabled) return 'board';
    return v;
  }, [boardRollout, legacyTimelineTabEnabled, searchParams]);

  useEffect(() => {
    const raw = searchParams.get(PORTAL_PLAN_VIEW_QUERY_KEY);
    const parsed = parsePortalPlanViewParam(raw);
    if (!boardRollout && (parsed === 'board' || parsed === 'timeline')) {
      navigate({ search: `?${PORTAL_PLAN_VIEW_QUERY_KEY}=roadmap` }, { replace: true });
      return;
    }
    if (boardRollout && parsed === 'timeline' && !legacyTimelineTabEnabled) {
      navigate({ search: `?${PORTAL_PLAN_VIEW_QUERY_KEY}=board` }, { replace: true });
    }
  }, [boardRollout, legacyTimelineTabEnabled, navigate, searchParams]);

  const roadmapActive = view === 'roadmap';
  const boardActive = view === 'board';
  const timelineActive = view === 'timeline';

  const [mountedRoadmap, setMountedRoadmap] = useState(roadmapActive);
  const [mountedBoard, setMountedBoard] = useState(boardActive);
  const [mountedTimeline, setMountedTimeline] = useState(timelineActive);

  useEffect(() => {
    if (roadmapActive) setMountedRoadmap(true);
  }, [roadmapActive]);

  useEffect(() => {
    if (boardActive) setMountedBoard(true);
  }, [boardActive]);

  useEffect(() => {
    if (timelineActive) setMountedTimeline(true);
  }, [timelineActive]);

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
            <Suspense fallback={<PlanLazySuspenseFallback />}>
              <PortalDeliveryBoardSurfaceLazy unifiedShellTabActive={boardActive} />
            </Suspense>
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
        {mountedTimeline && legacyTimelineTabEnabled ? (
          <div
            hidden={!timelineActive}
            {...(!timelineActive ? { inert: '' as const } : {})}
            data-testid="portal-plan-timeline-panel"
          >
            <Suspense fallback={<PlanLazySuspenseFallback />}>
              <PortalPlanTimelineSurfaceLazy unifiedShellTabActive={timelineActive} />
            </Suspense>
          </div>
        ) : null}
      </PortalPlanUnifiedShellCoordinator>
    </PortalPlanOrchestrationProvider>
  );
}
