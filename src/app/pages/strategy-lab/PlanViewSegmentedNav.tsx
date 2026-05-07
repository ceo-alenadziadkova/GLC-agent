import { useId, useState } from 'react';
import { Link, useLocation } from 'react-router';

import { Button } from '../../components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { buildAppRoute } from '../../config/route-paths';
import { isPlanDeliveryBoardUiEnabled } from '../../config/plan-delivery-board-ui';
import { cn } from '../../components/ui/utils';
import { buildPlanUrlWithViewPreservingForeignParams } from '../../lib/plan-cross-nav';

export type PlanViewSegmentActive = 'roadmap' | 'board' | 'table';

export interface PlanViewSegmentedNavProps {
  auditId: string;
  isClient: boolean;
  active: PlanViewSegmentActive;
  /** Compressed Plan chrome: merges with breadcrumb/workbench row. */
  layout?: 'default' | 'toolbar' | undefined;
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
 * Consultant/client Plan segmented nav: Delivery Board (rollout), Roadmap (Gantt), Table (list projection).
 */
export function PlanViewSegmentedNav({ auditId, isClient, active, layout = 'default' }: PlanViewSegmentedNavProps) {
  const descriptionId = useId();
  const learnMoreHeadingId = useId();
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const location = useLocation();
  const copy = STRATEGY_LAB_COPY.planViewSegment;
  const toolbar = layout === 'toolbar';
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
  const tableHref = buildPlanUrlWithViewPreservingForeignParams({
    pathname: planPath,
    currentSearch,
    nextView: 'table',
  });
  const boardHref = buildPlanUrlWithViewPreservingForeignParams({
    pathname: planPath,
    currentSearch,
    nextView: 'board',
  });
  const showBoard = isPlanDeliveryBoardUiEnabled();

  const segmentNav = (
    <div
      aria-describedby={descriptionId}
      className={cn(
        'bg-muted text-muted-foreground flex w-full gap-1 rounded-lg border border-border p-1',
        toolbar ? 'sm:inline-flex sm:w-auto sm:min-w-0 sm:flex-1 sm:flex-nowrap sm:justify-start' : 'mb-2 flex-wrap md:max-w-3xl',
      )}
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
      <Link
        to={tableHref}
        aria-current={active === 'table' ? 'page' : undefined}
        className={segmentLinkClass(active === 'table')}
      >
        {copy.tableTabLabel}
      </Link>
    </div>
  );

  const contextHint =
    active === 'roadmap' ? copy.roadmapContextHint : active === 'board' ? copy.boardContextHint : copy.tableContextHint;

  if (toolbar) {
    return (
      <nav aria-label={copy.ariaLabel} className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <p id={descriptionId} className="sr-only">
          {copy.description}
        </p>
        <div className="min-w-0 flex-1">{segmentNav}</div>
        <Collapsible open={learnMoreOpen} onOpenChange={setLearnMoreOpen} className="shrink-0">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={copy.toolbarViewsHelpAriaLabel}
              aria-expanded={learnMoreOpen}
              className="text-muted-foreground h-8 shrink-0 px-2 text-xs font-medium"
            >
              {learnMoreOpen ? copy.learnMoreHide : copy.learnMoreTrigger}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="bg-card border-border mt-2 max-w-[min(22rem,calc(100vw-2rem))] rounded-md border p-3">
            <div className="text-muted-foreground space-y-2 text-xs leading-relaxed">
              <p className="m-0 font-medium">{copy.boardTabLabel}</p>
              <p className="m-0">{copy.boardContextHint}</p>
              <p className="m-0 font-medium">{copy.roadmapTabLabel}</p>
              <p className="m-0">{copy.roadmapContextHint}</p>
              <p className="m-0 font-medium">{copy.tableTabLabel}</p>
              <p className="m-0">{copy.tableContextHint}</p>
              <p className="border-border text-muted-foreground m-0 border-t pt-2 text-[length:var(--text-2xs)] leading-snug">{copy.differentiationIntro}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </nav>
    );
  }

  return (
    <nav aria-label={copy.ariaLabel} className="w-full">
      <p id={descriptionId} className="sr-only">
        {copy.description}
      </p>
      {segmentNav}
      <div className="text-muted-foreground mb-2 max-w-prose space-y-1 text-xs leading-snug md:max-w-2xl">
        <p className="m-0">{contextHint}</p>
        {active === 'roadmap' ? (
          <p className="m-0 text-[length:var(--text-2xs)] opacity-90">{ORCHESTRATION_UI_COPY.timelineExecutionRealismNote}</p>
        ) : null}
      </div>
      <Collapsible open={learnMoreOpen} onOpenChange={setLearnMoreOpen} className="mb-0">
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={learnMoreOpen}
            aria-controls={`${learnMoreHeadingId}-content`}
            id={learnMoreHeadingId}
            className="text-muted-foreground hover:text-foreground h-auto px-2 py-1 text-[length:var(--text-2xs)] font-medium md:max-w-prose md:justify-start"
          >
            {learnMoreOpen ? copy.learnMoreHide : copy.learnMoreTrigger}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent id={`${learnMoreHeadingId}-content`}>
          <p className="text-muted-foreground mt-1 max-w-prose text-xs leading-relaxed md:max-w-2xl">{copy.differentiationIntro}</p>
        </CollapsibleContent>
      </Collapsible>
    </nav>
  );
}
