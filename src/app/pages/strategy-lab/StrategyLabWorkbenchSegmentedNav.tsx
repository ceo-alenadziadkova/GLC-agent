import { useId } from 'react';
import { Link } from 'react-router';

import { buildAppRoute } from '../../config/route-paths';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { cn } from '../../components/ui/utils';

/** Consultant-only switch between Strategy Lab tooling and roadmap schedule surfaces. */
export type StrategyLabWorkbenchSegmentActive = 'orchestration' | 'roadmap';

export interface StrategyLabWorkbenchSegmentedNavProps {
  auditId: string;
  /** Current route semantics (Strategy Lab vs roadmap schedule page). */
  active: StrategyLabWorkbenchSegmentActive;
}

/**
 * Unified segmented navigation: orchestration tooling vs consultant roadmap schedule.
 * Paired surfaces under the same Strategy Lab rollout flag on both pages.
 */
export function StrategyLabWorkbenchSegmentedNav({ auditId, active }: StrategyLabWorkbenchSegmentedNavProps) {
  const descriptionId = useId();
  const copy = STRATEGY_LAB_COPY.workbenchSegment;
  const strategyHref = buildAppRoute.strategy(auditId);
  const roadmapHref = buildAppRoute.roadmap(auditId);

  return (
    <nav aria-label={copy.ariaLabel} className="w-full">
      <p id={descriptionId} className="sr-only">
        {copy.description}
      </p>
      <div
        aria-describedby={descriptionId}
        className="bg-muted text-muted-foreground flex w-full max-w-md gap-1 rounded-lg border border-border p-1"
      >
        <Link
          to={strategyHref}
          aria-current={active === 'orchestration' ? 'page' : undefined}
          className={cn(
            'focus-visible:ring-ring text-center text-sm font-semibold no-underline transition-colors rounded-md px-3 py-2 outline-none flex-1 min-w-0',
            active === 'orchestration'
              ? 'bg-card text-foreground shadow-sm ring-1 ring-primary/25'
              : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
          )}
        >
          {copy.orchestrationLabel}
        </Link>
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
          {copy.roadmapLabel}
        </Link>
      </div>
    </nav>
  );
}
