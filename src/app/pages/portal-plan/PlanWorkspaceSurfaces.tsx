import { lazy, Suspense } from 'react';
import { useParams } from 'react-router';

import { AppShell } from '../../components/AppShell';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { usePlanWorkspaceMode } from '../../hooks/usePlanWorkspaceMode';
import { useProfile } from '../../hooks/useProfile';
import { PlanAdvancedDrawerProvider } from '../../context/PlanAdvancedDrawerContext';
import { PlanAdvancedDrawerShell } from '../strategy-lab/PlanAdvancedDrawer';
import { PortalPlanLayout } from './PortalPlanLayout';
import { usePortalPlanOrchestration } from './PortalPlanOrchestrationProvider';
import { PortalPlanUnifiedShellCoordinator } from './PortalPlanUnifiedShell';
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

const PortalRoadmapGanttSurfaceLazy = lazy(async () => {
  const m = await import('../PortalRoadmapGanttPage');
  return { default: m.PortalRoadmapGanttSurface };
});

function PlanLazySuspenseFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <p className="text-muted-foreground text-sm">{PLAN_WORKSPACE_UI_COPY.loadingHeadline}</p>
    </div>
  );
}

function PortalPlanStudioBody({ auditId, mode }: { auditId: string; mode: 'define' | 'shape' }) {
  const { isClient } = useProfile();
  const { audit } = usePortalPlanOrchestration();
  return (
    <PlanAdvancedDrawerProvider>
      <AppShell title={STRATEGY_LAB_COPY.appShell.title}>
        <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="board" hideExecuteViewTabs>
          {mode === 'define' ? <PlanDefineSurface /> : <PlanShapeSurface />}
        </PortalPlanLayout>
      </AppShell>
      <PlanAdvancedDrawerShell />
    </PlanAdvancedDrawerProvider>
  );
}

/** Strategy Lab studio route (`/lab/:id`, `/portal/lab/:id`; `?mode=define|shape`). */
export function PlanStudioWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const { mode } = usePlanWorkspaceMode();
  const studioMode: 'define' | 'shape' = mode === 'define' ? 'define' : 'shape';

  if (!id) return null;

  return <PortalPlanStudioBody auditId={id} mode={studioMode} />;
}

export function PlanDeliveryBoardPage() {
  return (
    <PortalPlanUnifiedShellCoordinator activeView="board">
      <div data-testid="portal-plan-board-panel">
        <Suspense fallback={<PlanLazySuspenseFallback />}>
          <PortalDeliveryBoardSurfaceLazy unifiedShellTabActive={true} />
        </Suspense>
      </div>
    </PortalPlanUnifiedShellCoordinator>
  );
}

export function PlanDeliveryRoadmapPage() {
  return (
    <PortalPlanUnifiedShellCoordinator activeView="roadmap">
      <div data-testid="portal-plan-roadmap-panel">
        <Suspense fallback={<PlanLazySuspenseFallback />}>
          <PortalRoadmapGanttSurfaceLazy unifiedShellTabActive={true} />
        </Suspense>
      </div>
    </PortalPlanUnifiedShellCoordinator>
  );
}

export function PlanDeliveryTablePage() {
  return (
    <PortalPlanUnifiedShellCoordinator activeView="table">
      <div data-testid="portal-plan-table-panel">
        <Suspense fallback={<PlanLazySuspenseFallback />}>
          <PlanTableSurfaceLazy unifiedShellTabActive={true} />
        </Suspense>
      </div>
    </PortalPlanUnifiedShellCoordinator>
  );
}
