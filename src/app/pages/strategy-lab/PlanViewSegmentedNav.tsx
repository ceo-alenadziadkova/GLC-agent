import { useId } from 'react';
import { Link, useLocation } from 'react-router';

import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { buildAppRoute } from '../../config/route-paths';
import { isPlanDeliveryBoardUiEnabled } from '../../config/plan-delivery-board-ui';
import { cn } from '../../components/ui/utils';
import { buildPlanUrlWithViewPreservingForeignParams } from '../../lib/plan-cross-nav';

export type PlanViewSegmentActive = 'roadmap' | 'timeline' | 'board';

export interface PlanViewSegmentedNavProps {
  auditId: string;
  isClient: boolean;
  active: PlanViewSegmentActive;
}

function segmentLinkClass(active: boolean): string {
  return cn(
    'focus-visible:ring-ring text-center text-sm font-semibold no-underline transition-colors rounded-md px-3 py-2 outline-none flex-1 min-w-0',
    active
      ? 'bg-card text-foreground shadow-sm ring-1 ring-primary/25'
      : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
  );
}

/**
 * Consultant/client Plan segmented nav: Delivery Board (rollout), Roadmap (Gantt), legacy Timeline.
 */
export function PlanViewSegmentedNav({ auditId, isClient, active }: PlanViewSegmentedNavProps) {
  const descriptionId = useId();
  const location = useLocation();
  const copy = STRATEGY_LAB_COPY.planViewSegment;
  const planPath =
    isClient ?
      buildAppRoute.portalPlan(auditId, 'roadmap').replace(/\?.*$/, '')
    : buildAppRoute.plan(auditId, 'roadmap').replace(/\?.*$/, '');
  const currentSearch = location.search ?? '';
  const roadmapHref = buildPlanUrlWithViewPreservingForeignParams({
    pathname: planPath,
    currentSearch,
    nextView: 'roadmap',
  });
  const timelineHref = buildPlanUrlWithViewPreservingForeignParams({
    pathname: planPath,
    currentSearch,
    nextView: 'timeline',
  });
  const boardHref = buildPlanUrlWithViewPreservingForeignParams({
    pathname: planPath,
    nextView: 'board',
    currentSearch,
  });
  const showBoard = isPlanDeliveryBoardUiEnabled();
  const showTimeline = false;

  return (
    <nav aria-label={copy.ariaLabel} className="w-full">
      <p id={descriptionId} className="sr-only">
        {copy.description}
      </p>
      <p className="text-muted-foreground mb-2 max-w-prose text-xs leading-relaxed md:max-w-2xl">{copy.differentiationIntro}</p>
      <div
        aria-describedby={descriptionId}
        className="bg-muted text-muted-foreground flex w-full flex-wrap gap-1 rounded-lg border border-border p-1 md:max-w-3xl"
      >
        {showBoard ? (
          <Link
            to={boardHref}
            aria-current={active === 'board' ? 'page' : undefined}
            className={segmentLinkClass(active === 'board')}
          >
            {copy.boardTabLabel}
          </Link>
        ) : null}
        <Link
          to={roadmapHref}
          aria-current={active === 'roadmap' ? 'page' : undefined}
          className={segmentLinkClass(active === 'roadmap')}
        >
          {copy.roadmapTabLabel}
        </Link>
        {showTimeline ? (
          <Link
            to={timelineHref}
            aria-current={active === 'timeline' ? 'page' : undefined}
            className={segmentLinkClass(active === 'timeline')}
          >
            {copy.timelineTabLabel}
          </Link>
        ) : null}
      </div>
      <div className="text-muted-foreground mt-2 max-w-prose space-y-1 text-[length:var(--text-2xs)] leading-relaxed md:max-w-2xl">
        <p className="m-0">{active === 'roadmap' ? copy.roadmapContextHint : active === 'board' ? copy.boardContextHint : copy.timelineContextHint}</p>
        {active === 'timeline' ? (
          <p className="m-0 text-[length:var(--text-2xs)] opacity-90">{ORCHESTRATION_UI_COPY.timelineExecutionRealismNote}</p>
        ) : null}
      </div>
    </nav>
  );
}
