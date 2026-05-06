import { useCallback, useMemo } from 'react';
import { Link, useParams } from 'react-router';

import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/button';
import { RoadmapGanttView } from '../components/roadmap-gantt/RoadmapGanttView';
import type { RoadmapGanttPlanBoardHydration } from '../components/roadmap-gantt/RoadmapGanttView';
import { useProfile } from '../hooks/useProfile';
import { usePlanBoardQuery } from '../data/api/plan-board-queries';
import { buildRoadmapGanttProjection } from '../lib/roadmap-gantt-mapper';
import { isGlcOrchestrationPackView } from '../lib/orchestration-pack-guards';
import { isPlanDeliveryBoardUiEnabled } from '../config/plan-delivery-board-ui';
import { buildAppRoute } from '../config/route-paths';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
import { PLAN_WORKSPACE_UI_COPY } from '../config/plan-workspace-ui-copy.en';
import { mergeFocusIntoPlanHref } from '../lib/plan-cross-nav';
import { PortalPlanLayout } from './portal-plan/PortalPlanLayout';
import {
  PortalPlanOrchestrationProvider,
  usePortalPlanOrchestration,
} from './portal-plan/PortalPlanOrchestrationProvider';
import { PortalPlanSurfaceChrome } from './portal-plan/PortalPlanUnifiedShell';
import {
  PortalPlanEmptyCallout,
  PortalPlanErrorState,
  PortalPlanLoadingState,
} from './portal-plan/PortalPlanPageStates';
import { PlanConsultantManualCardDialog } from './portal-plan/PlanConsultantManualCardDialog';
import { PortalPlanRoadmapScopeCallout } from './portal-plan/portal-plan-roadmap-scope-callout';
import { countTimelineLaneItems } from '../lib/audit-timeline-lane-item-count';

export type PortalRoadmapGanttSurfaceProps = {
  /** Canonical `/plan`: pass roadmap tab active flag so inactive pane does not overwrite unified shell headings. */
  unifiedShellTabActive?: boolean | undefined;
};

/** Roadmap/Gantt Plan body; expects `PortalPlanOrchestrationProvider` above (shared with Timeline on `/plan`). */
export function PortalRoadmapGanttSurface(props?: PortalRoadmapGanttSurfaceProps) {
  const { unifiedShellTabActive } = props ?? {};
  const { auditId, audit, auditLoading: loading, auditError: error, timelineQuery, packQuery } =
    usePortalPlanOrchestration();
  const id = auditId;
  const { isClient } = useProfile();

  const strategyHref = isClient ? buildAppRoute.portalStrategy(id) : buildAppRoute.strategy(id);
  const timelineHref = isClient ? buildAppRoute.portalPlan(id, 'timeline') : buildAppRoute.plan(id, 'timeline');

  const getDeliveryBoardHrefForPackNode = useCallback(
    (nodeId: string) => {
      if (!isPlanDeliveryBoardUiEnabled()) return null;
      const base = isClient ? buildAppRoute.portalPlan(id, 'board') : buildAppRoute.plan(id, 'board');
      return mergeFocusIntoPlanHref(base, nodeId);
    },
    [id, isClient],
  );

  /** Match legacy branches: do not subscribe to plan-board until timeline body is ready (avoids hook order shifts). */
  const canRenderRoadmapBody =
    !loading &&
    !timelineQuery.isPending &&
    !error &&
    !timelineQuery.isError &&
    Boolean(timelineQuery.data?.timeline);

  const pack = packQuery.data?.pack ?? null;
  const boardPackEligible = Boolean(pack) && isGlcOrchestrationPackView(pack);
  const boardSurfaceEnabled =
    isPlanDeliveryBoardUiEnabled() && boardPackEligible && canRenderRoadmapBody;

  const boardQuery = usePlanBoardQuery({
    auditId: id,
    enabled: Boolean(id) && boardSurfaceEnabled,
  });

  const planBoardHydration = useMemo((): RoadmapGanttPlanBoardHydration => {
    if (!boardSurfaceEnabled) return undefined;
    const issues = boardQuery.data?.issues ?? [];
    return {
      enabled: true,
      pending: boardQuery.isPending || boardQuery.isFetching,
      fetchFailed: boardQuery.isError,
      blockedNoPack: issues.some(i => i.code === 'no_pack'),
      blockedGovernance: issues.some(i => i.code === 'governance_blocked'),
      cards: boardQuery.data?.cards ?? [],
      packVersionUsed:
        boardQuery.data?.pack_version_used ?? packQuery.data?.orchestration_pack_version ?? 0,
      role: isClient ? 'client' : 'consultant',
    };
  }, [
    boardSurfaceEnabled,
    boardQuery.data?.cards,
    boardQuery.data?.issues,
    boardQuery.data?.pack_version_used,
    boardQuery.isError,
    boardQuery.isFetching,
    boardQuery.isPending,
    isClient,
    packQuery.data?.orchestration_pack_version,
  ]);

  const roadmapScopeGovernanceBlocked = planBoardHydration?.blockedGovernance ?? false;
  const roadmapScopeOrphanCount =
    planBoardHydration?.cards?.filter((c) => Boolean(c.orphaned_reason)).length ?? 0;

  if (loading || timelineQuery.isPending) {
    return (
      <PortalPlanSurfaceChrome
        branch="roadmap"
        tabActive={unifiedShellTabActive}
        title={ORCHESTRATION_UI_COPY.planRoadmapShellTitle}
        subtitle={PLAN_WORKSPACE_UI_COPY.loadingHeadline}
      >
        <PortalPlanLayout auditId={id} isClient={isClient} audit={audit} activePlanView="roadmap">
          <PortalPlanLoadingState
            layout="roadmap"
            headline={PLAN_WORKSPACE_UI_COPY.loadingHeadline}
            detail={PLAN_WORKSPACE_UI_COPY.loadingDetail}
          />
        </PortalPlanLayout>
      </PortalPlanSurfaceChrome>
    );
  }

  if (error || timelineQuery.isError || !timelineQuery.data?.timeline) {
    const message =
      timelineQuery.isError && !error ? ORCHESTRATION_UI_COPY.planRoadmapTimelineQueryFailedBody : ORCHESTRATION_UI_COPY.planRoadmapLoadErrorBody;
    return (
      <PortalPlanSurfaceChrome
        branch="roadmap"
        tabActive={unifiedShellTabActive}
        title={ORCHESTRATION_UI_COPY.planRoadmapShellTitle}
        subtitle={ORCHESTRATION_UI_COPY.planRoadmapErrorSubtitle}
      >
        <PortalPlanLayout auditId={id} isClient={isClient} audit={audit} activePlanView="roadmap">
          <PortalPlanErrorState message={message}>
            <Button asChild variant="outline" size="sm" className="no-underline">
              <Link to={strategyHref}>{ORCHESTRATION_UI_COPY.planRoadmapBackToStrategyCta}</Link>
            </Button>
          </PortalPlanErrorState>
        </PortalPlanLayout>
      </PortalPlanSurfaceChrome>
    );
  }

  const projection = buildRoadmapGanttProjection(timelineQuery.data.timeline, {
    pack: packQuery.data?.pack ?? null,
  });

  const laneItemCount = countTimelineLaneItems(timelineQuery.data.timeline);

  if (projection.tasks.length === 0) {
    const mapperDrift = laneItemCount > 0;
    const emptyTitle = mapperDrift
      ? ORCHESTRATION_UI_COPY.planRoadmapMapperEmptyTasksTitle
      : ORCHESTRATION_UI_COPY.planRoadmapEmptyTasksTitle;
    const emptyBody = mapperDrift
      ? isClient
        ? ORCHESTRATION_UI_COPY.planRoadmapMapperEmptyTasksClientHint
        : ORCHESTRATION_UI_COPY.planRoadmapMapperEmptyTasksHint
      : isClient
        ? ORCHESTRATION_UI_COPY.planRoadmapEmptyTasksClientHint
        : ORCHESTRATION_UI_COPY.planRoadmapEmptyTasksHint;

    return (
      <PortalPlanSurfaceChrome
        branch="roadmap"
        tabActive={unifiedShellTabActive}
        title={ORCHESTRATION_UI_COPY.planRoadmapShellTitle}
        subtitle={ORCHESTRATION_UI_COPY.planRoadmapShellSubtitle}
      >
        <div className="mx-auto max-w-6xl space-y-4">
          <PortalPlanLayout auditId={id} isClient={isClient} audit={audit} activePlanView="roadmap">
            <PortalPlanEmptyCallout title={emptyTitle} body={emptyBody}>
              {!isClient ? (
                <Button asChild variant="default" size="sm" className="no-underline">
                  <Link to={strategyHref}>{ORCHESTRATION_UI_COPY.planRoadmapBackToStrategyCta}</Link>
                </Button>
              ) : null}
              {mapperDrift ? (
                <Button asChild variant="outline" size="sm" className="no-underline">
                  <Link to={timelineHref}>{ORCHESTRATION_UI_COPY.planRoadmapOpenTimelineFromEmptyCta}</Link>
                </Button>
              ) : null}
            </PortalPlanEmptyCallout>
          </PortalPlanLayout>
        </div>
      </PortalPlanSurfaceChrome>
    );
  }

  return (
    <PortalPlanSurfaceChrome
      branch="roadmap"
      tabActive={unifiedShellTabActive}
      title={ORCHESTRATION_UI_COPY.planRoadmapShellTitle}
      subtitle={ORCHESTRATION_UI_COPY.planRoadmapShellSubtitle}
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <PortalPlanLayout auditId={id} isClient={isClient} audit={audit} activePlanView="roadmap">
          <div className="space-y-3">
            <PortalPlanRoadmapScopeCallout
              auditId={id}
              governanceBlocked={roadmapScopeGovernanceBlocked}
              orphanCardCount={roadmapScopeOrphanCount}
            />
            {planBoardHydration?.enabled && planBoardHydration.pending ?
              <p className="text-muted-foreground m-0 text-xs" role="status">
                {PLAN_WORKSPACE_UI_COPY.roadmapHydratingDeliveryBoardHint}
              </p>
            : null}
            <RoadmapGanttView
              auditId={id}
              projection={projection}
              strategyHref={strategyHref}
              getDeliveryBoardHrefForPackNode={getDeliveryBoardHrefForPackNode}
              planBoardHydration={planBoardHydration}
              toolbarLeadingSlot={!isClient ? <PlanConsultantManualCardDialog /> : null}
            />
          </div>
        </PortalPlanLayout>
      </div>
    </PortalPlanSurfaceChrome>
  );
}

/** Standalone Roadmap page (tests, direct entry): wraps surface with orchestration provider. */
export function PortalRoadmapGanttPage() {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    return (
      <AppShell title={ORCHESTRATION_UI_COPY.planRoadmapShellTitle} subtitle={ORCHESTRATION_UI_COPY.planRoadmapErrorSubtitle}>
        <div className="mx-auto max-w-4xl text-sm ds-text-score-1">{ORCHESTRATION_UI_COPY.planSurfaceMissingAuditId}</div>
      </AppShell>
    );
  }
  return (
    <PortalPlanOrchestrationProvider auditId={id}>
      <PortalRoadmapGanttSurface />
    </PortalPlanOrchestrationProvider>
  );
}
