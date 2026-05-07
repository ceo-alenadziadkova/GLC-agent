import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router';

import { AppShell } from '../../components/AppShell';
import { PlanCommandPalette } from '../../components/PlanCommandPalette';
import { APP_ROUTE_PATHS } from '../../config/route-paths';
import { PORTAL_PLAN_VIEW_QUERY_KEY, parsePortalPlanViewParam } from '../../config/portal-plan';
import {
  isPlanDeliveryBoardUiEnabled,
  planOrchestrationIncludeTimelineForUnifiedPlanView,
} from '../../config/plan-delivery-board-ui';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { usePlanWorkspaceMode } from '../../hooks/usePlanWorkspaceMode';
import { useProfile } from '../../hooks/useProfile';
import { PortalRoadmapGanttSurface } from '../PortalRoadmapGanttPage';
import { PortalPlanLayout } from './PortalPlanLayout';
import { PortalPlanOrchestrationProvider, usePortalPlanOrchestration } from './PortalPlanOrchestrationProvider';
import { PortalPlanUnifiedShellCoordinator } from './PortalPlanUnifiedShell';
import type { PlanSurfaceBranch } from './PortalPlanUnifiedShell';
import { PlanCommandRegistryProvider } from '../../context/PlanCommandRegistryContext';
import { PlanAdvancedDrawerProvider } from '../../context/PlanAdvancedDrawerContext';
import { PlanAdvancedDrawerShell } from '../strategy-lab/PlanAdvancedDrawer';
import { PlanDefineSurface } from './surfaces/PlanDefineSurface';
import { PlanShapeSurface } from './surfaces/PlanShapeSurface';

const PortalDeliveryBoardSurfaceLazy = lazy(async () => {
  const m = await import('./board/BoardView');
  return { default: m.PortalDeliveryBoardSurface };
});

const PlanTableSurfaceLazy = lazy(async () => {
  const m = await import('./surfaces/PlanTableSurface');
  return { default: m.PlanTableSurface };
});

function PlanLazySuspenseFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <p className="text-muted-foreground text-sm">{PLAN_WORKSPACE_UI_COPY.loadingHeadline}</p>
    </div>
  );
}

function PortalPlanStudioPage({ auditId, mode }: { auditId: string; mode: 'define' | 'shape' }) {
  const { isClient } = useProfile();
  const { audit } = usePortalPlanOrchestration();
  return (
    <PlanAdvancedDrawerProvider>
      <AppShell title={STRATEGY_LAB_COPY.appShell.title} subtitle={STRATEGY_LAB_COPY.appShell.subtitle}>
        <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="board" hideExecuteViewTabs>
          {mode === 'define' ? <PlanDefineSurface /> : <PlanShapeSurface />}
        </PortalPlanLayout>
      </AppShell>
      <PlanAdvancedDrawerShell />
    </PlanAdvancedDrawerProvider>
  );
}

/**
 * Single entry for canonical Plan URLs (`/plan/:id`, `/portal/plan/:id`).
 * Tabs: Board, Roadmap, Table (execute). Shared orchestration queries stay mounted across tab switches.
 */
export function PortalPlanPage() {
  const { id } = useParams<{ id: string }>();
  const { isClient } = useProfile();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { mode } = usePlanWorkspaceMode();

  const boardRollout = isPlanDeliveryBoardUiEnabled();

  const view: PlanSurfaceBranch = useMemo(() => {
    const v = parsePortalPlanViewParam(searchParams.get(PORTAL_PLAN_VIEW_QUERY_KEY));
    if (!boardRollout && (v === 'board' || v === 'table')) return 'roadmap';
    return v;
  }, [boardRollout, searchParams]);

  useEffect(() => {
    const raw = searchParams.get(PORTAL_PLAN_VIEW_QUERY_KEY);
    const parsed = parsePortalPlanViewParam(raw);
    if (!boardRollout && (parsed === 'board' || parsed === 'table')) {
      navigate({ search: `?${PORTAL_PLAN_VIEW_QUERY_KEY}=roadmap` }, { replace: true });
      return;
    }
    /** Canonicalize legacy `?view=timeline` to board/roadmap (ADR GLC-PB-019). */
    if (raw != null && String(raw).trim().toLowerCase() === 'timeline' && parsed !== raw) {
      const next = new URLSearchParams(searchParams);
      next.set(PORTAL_PLAN_VIEW_QUERY_KEY, parsed);
      const qs = next.toString();
      navigate({ search: qs ? `?${qs}` : '' }, { replace: true });
    }
  }, [boardRollout, navigate, searchParams]);

  const roadmapActive = view === 'roadmap';
  const boardActive = view === 'board';
  const tableActive = view === 'table';

  const [mountedRoadmap, setMountedRoadmap] = useState(roadmapActive);
  const [mountedBoard, setMountedBoard] = useState(boardActive);
  const [mountedTable, setMountedTable] = useState(tableActive);

  useEffect(() => {
    if (roadmapActive) setMountedRoadmap(true);
  }, [roadmapActive]);

  useEffect(() => {
    if (boardActive) setMountedBoard(true);
  }, [boardActive]);

  useEffect(() => {
    if (tableActive) setMountedTable(true);
  }, [tableActive]);

  const orchestrationIncludeTimeline = planOrchestrationIncludeTimelineForUnifiedPlanView(
    mode === 'execute' ? view : 'roadmap',
  );

  if (!id) {
    return <Navigate to={isClient ? APP_ROUTE_PATHS.portal : APP_ROUTE_PATHS.dashboard} replace />;
  }

  if (mode === 'define' || mode === 'shape') {
    return (
      <PlanCommandRegistryProvider>
        <PortalPlanOrchestrationProvider auditId={id} includeTimeline>
          <PlanCommandPalette />
          <PortalPlanStudioPage auditId={id} mode={mode} />
        </PortalPlanOrchestrationProvider>
      </PlanCommandRegistryProvider>
    );
  }

  return (
    <PlanCommandRegistryProvider>
      <PortalPlanOrchestrationProvider auditId={id} includeTimeline={orchestrationIncludeTimeline}>
        <PlanCommandPalette />
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
        {mountedTable ? (
          <div
            hidden={!tableActive}
            {...(!tableActive ? { inert: '' as const } : {})}
            data-testid="portal-plan-table-panel"
          >
            <Suspense fallback={<PlanLazySuspenseFallback />}>
              <PlanTableSurfaceLazy unifiedShellTabActive={tableActive} />
            </Suspense>
          </div>
        ) : null}
        </PortalPlanUnifiedShellCoordinator>
      </PortalPlanOrchestrationProvider>
    </PlanCommandRegistryProvider>
  );
}
