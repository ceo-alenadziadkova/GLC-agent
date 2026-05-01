import { Link } from 'react-router';
import { CaretRight } from '@phosphor-icons/react';

import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { buildAppRoute } from '../../config/route-paths';
import type { AuditState } from '../../data/audit/contracts/state/audit-state.types';
import type { StrategyJourneyStepComputed } from '../../lib/strategy-journey-status';
import { cn } from '../../components/ui/utils';
import { PlanViewSegmentedNav, type PlanViewSegmentActive } from './PlanViewSegmentedNav';
import { StrategyJourneyHeader } from './StrategyJourneyHeader';
import { StrategyLabWorkbenchSegmentedNav } from './StrategyLabWorkbenchSegmentedNav';

export type StrategyPlanningChromeVariant =
  | { kind: 'strategy-lab' }
  | { kind: 'plan'; activePlanView: PlanViewSegmentActive }
  | { kind: 'manifest-wizard' };

export type StrategyPlanningChromeProps = {
  auditId: string;
  isClient: boolean;
  audit: AuditState | null;
  variant: StrategyPlanningChromeVariant;
  steps: ReadonlyArray<StrategyJourneyStepComputed>;
  /** Override first workbench tab target (default: `/strategy/:id` — set to orchestration cockpit when rendered there). */
  workbenchOrchestrationHref?: string;
};

/**
 * Shared sticky chrome for orchestration ↔ plan journey (workbench, breadcrumb where needed, segmented plan tabs, four-step strip).
 * Keeps class names aligned between Strategy Lab and portal plan shells.
 */
export function StrategyPlanningChrome({
  auditId,
  isClient,
  audit,
  variant,
  steps,
  workbenchOrchestrationHref,
}: StrategyPlanningChromeProps) {
  const orchestrationUiEnabled = APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled;
  /** Strategy Lab historically always shows the strip when the sticky chrome mounts; Plan surfaces wait until strategy exists. */
  const stripVisible =
    variant.kind === 'strategy-lab' ? true : Boolean(orchestrationUiEnabled && audit?.strategy);
  const strategyHref = isClient ? buildAppRoute.portalStrategy(auditId) : buildAppRoute.strategy(auditId);
  const bc = STRATEGY_LAB_COPY.planSurfaceBreadcrumb;

  const showWorkbench = !isClient && orchestrationUiEnabled;
  const workbenchActive =
    variant.kind === 'strategy-lab' ? 'orchestration' : variant.kind === 'plan' ? 'plan' : 'plan';

  return (
    <div className="bg-card border-border divide-border sticky top-0 z-[15] divide-y border-b">
      {showWorkbench ? (
        <div className="px-4 py-3">
          <StrategyLabWorkbenchSegmentedNav
            auditId={auditId}
            active={workbenchActive}
            orchestrationHref={workbenchOrchestrationHref}
          />
        </div>
      ) : null}
      {variant.kind === 'strategy-lab' ? null : (
        <div className="px-4 py-2">
          <nav aria-label={bc.navAriaLabel} className="flex flex-wrap items-center gap-1 text-xs">
            <Link
              to={strategyHref}
              className={cn(
                'text-muted-foreground hover:text-foreground focus-visible:ring-ring font-medium no-underline outline-none transition-colors',
                'rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2',
              )}
            >
              {bc.strategyLabCrumb}
            </Link>
            <CaretRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden />
            {variant.kind === 'manifest-wizard' ? (
              <span className="text-foreground font-medium" aria-current="page">
                {bc.manifestWizardCrumb}
              </span>
            ) : (
              <span className="text-foreground font-medium" aria-current="page">
                {bc.planCrumb}
              </span>
            )}
          </nav>
        </div>
      )}
      <div className="px-4 py-3 pt-1">
        {variant.kind === 'manifest-wizard' ? (
          <p className="text-muted-foreground max-w-prose text-xs leading-relaxed md:max-w-2xl">
            {STRATEGY_LAB_COPY.manifestWizardChrome.contextHint}
          </p>
        ) : variant.kind === 'plan' ? (
          <PlanViewSegmentedNav auditId={auditId} isClient={isClient} active={variant.activePlanView} />
        ) : null}
      </div>
      <StrategyJourneyHeader auditId={auditId} isClient={isClient} steps={steps} visible={stripVisible} />
    </div>
  );
}
