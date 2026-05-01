import { useId } from 'react';
import { Link } from 'react-router';

import { buildAppRoute } from '../../config/route-paths';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { cn } from '../../components/ui/utils';

/** Consultant-only switch between Strategy Lab tooling and Plan execution surface. */
export type StrategyLabWorkbenchSegmentActive = 'orchestration' | 'plan';

export interface StrategyLabWorkbenchSegmentedNavProps {
  auditId: string;
  /** Current route semantics (Strategy Lab vs Plan pages — roadmap lanes or timeline). */
  active: StrategyLabWorkbenchSegmentActive;
  /**
   * Consultant entry for “Orchestration” tooling (defaults to Strategy Lab).
   * Use the orchestration cockpit route when the workbench is rendered from `/audit/:id/orchestration`.
   */
  orchestrationHref?: string;
}

/**
 * Unified segmented navigation: orchestration tooling vs consultant Plan surface.
 * Paired surfaces under the same Strategy Lab rollout flag on both pages.
 */
export function StrategyLabWorkbenchSegmentedNav({
  auditId,
  active,
  orchestrationHref: orchestrationHrefProp,
}: StrategyLabWorkbenchSegmentedNavProps) {
  const descriptionId = useId();
  const copy = STRATEGY_LAB_COPY.workbenchSegment;
  const orchestrationHref = orchestrationHrefProp ?? buildAppRoute.strategy(auditId);
  const roadmapHref = buildAppRoute.plan(auditId);

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
          to={orchestrationHref}
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
          aria-current={active === 'plan' ? 'page' : undefined}
          className={cn(
            'focus-visible:ring-ring text-center text-sm font-semibold no-underline transition-colors rounded-md px-3 py-2 outline-none flex-1 min-w-0',
            active === 'plan'
              ? 'bg-card text-foreground shadow-sm ring-1 ring-primary/25'
              : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
          )}
        >
          {copy.planLabel}
        </Link>
      </div>
      <p className="text-muted-foreground mt-2 max-w-prose text-[length:var(--text-2xs)] leading-relaxed">{copy.surfaceHint}</p>
    </nav>
  );
}
