import { Link, useParams } from 'react-router';

import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/button';
import { useProfile } from '../hooks/useProfile';
import { buildRoadmapGanttProjection } from '../lib/roadmap-gantt-mapper';
import { RoadmapGanttView } from '../components/roadmap-gantt/RoadmapGanttView';
import { buildAppRoute } from '../config/route-paths';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';
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

  if (loading || timelineQuery.isPending) {
    const roadmapLoadSubtitle =
      loading && !audit
        ? ORCHESTRATION_UI_COPY.planRoadmapLoadingAuditSubtitle
        : timelineQuery.isPending
          ? ORCHESTRATION_UI_COPY.planRoadmapLoadingTimelineSubtitle
          : ORCHESTRATION_UI_COPY.planRoadmapLoadingSubtitle;
    return (
      <PortalPlanSurfaceChrome
        branch="roadmap"
        tabActive={unifiedShellTabActive}
        title={ORCHESTRATION_UI_COPY.planRoadmapShellTitle}
        subtitle={roadmapLoadSubtitle}
      >
        <PortalPlanLayout auditId={id} isClient={isClient} audit={audit} activePlanView="roadmap">
          <PortalPlanLoadingState layout="roadmap" headline={roadmapLoadSubtitle} />
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
          <RoadmapGanttView auditId={id} projection={projection} strategyHref={strategyHref} />
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
