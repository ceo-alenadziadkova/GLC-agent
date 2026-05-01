import { useId } from 'react';
import { Link } from 'react-router';

import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { buildAppRoute } from '../../config/route-paths';
import { cn } from '../../components/ui/utils';

export type PlanViewSegmentActive = 'roadmap' | 'timeline';

export interface PlanViewSegmentedNavProps {
  auditId: string;
  isClient: boolean;
  active: PlanViewSegmentActive;
}

/**
 * Roadmap (Gantt lanes) vs Timeline (seasonal execution) under a single Plan IA.
 */
export function PlanViewSegmentedNav({ auditId, isClient, active }: PlanViewSegmentedNavProps) {
  const descriptionId = useId();
  const copy = STRATEGY_LAB_COPY.planViewSegment;
  const roadmapHref = isClient ? buildAppRoute.portalPlan(auditId, 'roadmap') : buildAppRoute.plan(auditId, 'roadmap');
  const timelineHref = isClient ? buildAppRoute.portalPlan(auditId, 'timeline') : buildAppRoute.plan(auditId, 'timeline');

  return (
    <nav aria-label={copy.ariaLabel} className="w-full">
      <p id={descriptionId} className="sr-only">
        {copy.description}
      </p>
      <p className="text-muted-foreground mb-2 max-w-prose text-xs leading-relaxed md:max-w-2xl">{copy.differentiationIntro}</p>
      <div
        aria-describedby={descriptionId}
        className="bg-muted text-muted-foreground flex w-full max-w-md gap-1 rounded-lg border border-border p-1"
      >
        <Link
          to={roadmapHref}
          aria-current={active === 'roadmap' ? 'page' : undefined}
          className={cn(
            'focus-visible:ring-ring text-center text-sm font-semibold no-underline transition-colors rounded-md px-3 py-2 outline-none flex-1 min-w-0',
            active === 'roadmap'
              ? 'bg-card text-foreground shadow-sm ring-1 ring-primary/25'
              : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
          )}
        >
          {copy.roadmapTabLabel}
        </Link>
        <Link
          to={timelineHref}
          aria-current={active === 'timeline' ? 'page' : undefined}
          className={cn(
            'focus-visible:ring-ring text-center text-sm font-semibold no-underline transition-colors rounded-md px-3 py-2 outline-none flex-1 min-w-0',
            active === 'timeline'
              ? 'bg-card text-foreground shadow-sm ring-1 ring-primary/25'
              : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
          )}
        >
          {copy.timelineTabLabel}
        </Link>
      </div>
      <div className="text-muted-foreground mt-2 max-w-prose space-y-1 text-[length:var(--text-2xs)] leading-relaxed md:max-w-2xl">
        <p className="m-0">{active === 'roadmap' ? copy.roadmapContextHint : copy.timelineContextHint}</p>
        {active === 'timeline' ? (
          <p className="m-0 text-[length:var(--text-2xs)] opacity-90">{ORCHESTRATION_UI_COPY.timelineExecutionRealismNote}</p>
        ) : null}
      </div>
    </nav>
  );
}
