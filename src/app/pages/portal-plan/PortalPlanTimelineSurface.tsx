import { Link } from 'react-router';

import { Button } from '../../components/ui/button';
import { PortalTimelinePackGraphPanel } from '../../components/glc/PortalTimelinePackGraphPanel';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { PLAN_BOARD_COPY } from '../../config/plan-board-copy.en';
import { ORCHESTRATION_IA_COPY, ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import { buildAppRoute } from '../../config/route-paths';
import { isGlcOrchestrationPackView } from '../../lib/orchestration-pack-guards';
import { useProfile } from '../../hooks/useProfile';
import { PortalPlanLayout } from './PortalPlanLayout';
import { PortalPlanEmptyCallout, PortalPlanErrorState, PortalPlanLoadingState } from './PortalPlanPageStates';
import { usePortalPlanOrchestration } from './PortalPlanOrchestrationProvider';
import { PortalPlanSurfaceChrome } from './PortalPlanUnifiedShell';

export type PortalPlanTimelineSurfaceProps = {
  unifiedShellTabActive?: boolean | undefined;
};

/**
 * Legacy unified Plan **Timeline** tab: pack graph narrative (read-only canvas + supporting copy).
 * Gated by `APP_FEATURE_FLAGS.planUnifiedLegacyTimelineTabEnabled` at the shell level.
 */
export function PortalPlanTimelineSurface(props?: PortalPlanTimelineSurfaceProps) {
  const { unifiedShellTabActive } = props ?? {};
  const { auditId, audit, auditLoading: loading, auditError: error, packQuery } = usePortalPlanOrchestration();
  const { isClient } = useProfile();

  const strategyHref = isClient ? buildAppRoute.portalStrategy(auditId) : buildAppRoute.strategy(auditId);
  const pack = packQuery.data?.pack ?? null;

  const subtitle = APP_FEATURE_FLAGS.orchestrationTimelinePrimaryUxEnabled
    ? ORCHESTRATION_IA_COPY.timelinePageSubtitleWhenPrimary
    : ORCHESTRATION_UI_COPY.timelineHint;

  if (loading || packQuery.isPending) {
    return (
      <PortalPlanSurfaceChrome
        branch="timeline"
        tabActive={unifiedShellTabActive}
        title={ORCHESTRATION_UI_COPY.timelineTitle}
        subtitle={PLAN_WORKSPACE_UI_COPY.loadingHeadline}
      >
        <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="timeline">
          <PortalPlanLoadingState
            layout="roadmap"
            headline={PLAN_WORKSPACE_UI_COPY.loadingHeadline}
            detail={PLAN_WORKSPACE_UI_COPY.loadingDetail}
          />
        </PortalPlanLayout>
      </PortalPlanSurfaceChrome>
    );
  }

  if (error || packQuery.isError) {
    return (
      <PortalPlanSurfaceChrome
        branch="timeline"
        tabActive={unifiedShellTabActive}
        title={ORCHESTRATION_UI_COPY.timelineTitle}
        subtitle={ORCHESTRATION_UI_COPY.planRoadmapErrorSubtitle}
      >
        <div className="mx-auto max-w-6xl space-y-4 px-4 pb-10 md:px-6">
          <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="timeline">
            <PortalPlanErrorState message={ORCHESTRATION_UI_COPY.planRoadmapLoadErrorBody}>
              <Button asChild variant="outline" size="sm" className="no-underline">
                <Link to={strategyHref}>{ORCHESTRATION_UI_COPY.planRoadmapBackToStrategyCta}</Link>
              </Button>
            </PortalPlanErrorState>
          </PortalPlanLayout>
        </div>
      </PortalPlanSurfaceChrome>
    );
  }

  if (!isGlcOrchestrationPackView(pack)) {
    return (
      <PortalPlanSurfaceChrome branch="timeline" tabActive={unifiedShellTabActive} title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={subtitle}>
        <div className="mx-auto max-w-6xl space-y-4 px-4 pb-10 md:px-6">
          <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="timeline">
            <PortalPlanEmptyCallout title={PLAN_BOARD_COPY.emptyNoPackTitle} body={PLAN_BOARD_COPY.emptyNoPackBody}>
              <Button asChild variant="default" size="sm" className="no-underline">
                <Link to={strategyHref}>{PLAN_BOARD_COPY.openStrategyLabCta}</Link>
              </Button>
            </PortalPlanEmptyCallout>
          </PortalPlanLayout>
        </div>
      </PortalPlanSurfaceChrome>
    );
  }

  return (
    <PortalPlanSurfaceChrome branch="timeline" tabActive={unifiedShellTabActive} title={ORCHESTRATION_UI_COPY.timelineTitle} subtitle={subtitle}>
      <div className="mx-auto max-w-6xl space-y-4 px-4 pb-10 md:px-6">
        <PortalPlanLayout auditId={auditId} isClient={isClient} audit={audit} activePlanView="timeline">
          <PortalTimelinePackGraphPanel pack={pack} />
        </PortalPlanLayout>
      </div>
    </PortalPlanSurfaceChrome>
  );
}
