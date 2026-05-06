import { Suspense, lazy, useState } from 'react';
import { Link } from 'react-router';
import { CaretRight } from '@phosphor-icons/react';

import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { isPlanDeliveryBoardUiEnabled } from '../../config/plan-delivery-board-ui';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import { ORCHESTRATION_IA_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { buildAppRoute } from '../../config/route-paths';
import type { AuditState } from '../../data/audit/contracts/state/audit-state.types';
import type { StrategyJourneyStepComputed } from '../../lib/strategy-journey-status';
import { Button } from '../../components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../components/ui/collapsible';
import { cn } from '../../components/ui/utils';
import type { PlanViewSegmentActive } from './PlanViewSegmentedNav';
import { StrategyJourneyHeader } from './StrategyJourneyHeader';
import { StrategyLabWorkbenchSegmentedNav } from './StrategyLabWorkbenchSegmentedNav';

/** Lazy so Strategy Lab (/strategy) does not preload Plan tab primitives (collapsible segment nav). */
const PlanViewSegmentedNavLazy = lazy(async () => {
  const m = await import('./PlanViewSegmentedNav');
  return { default: m.PlanViewSegmentedNav };
});

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
  const [planJourneyExpanded, setPlanJourneyExpanded] = useState(false);
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
      {variant.kind === 'strategy-lab' && orchestrationUiEnabled ? (
        <div className="px-4 py-2">
          <p className="text-muted-foreground max-w-prose text-xs leading-relaxed md:max-w-3xl">
            {ORCHESTRATION_IA_COPY.strategyVsPlanMicroHint}
          </p>
        </div>
      ) : null}
      {variant.kind === 'manifest-wizard' ? (
        <>
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
              <span className="text-foreground font-medium" aria-current="page">
                {bc.manifestWizardCrumb}
              </span>
            </nav>
          </div>
          <div className="px-4 py-3 pt-1">
            <p className="text-muted-foreground max-w-prose text-xs leading-relaxed md:max-w-2xl">
              {STRATEGY_LAB_COPY.manifestWizardChrome.contextHint}
            </p>
          </div>
        </>
      ) : variant.kind === 'plan' ?
        <div className="px-4 py-2 pb-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between xl:gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
              <nav aria-label={bc.navAriaLabel} className="flex shrink-0 flex-wrap items-center gap-1 text-xs">
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
                <span className="text-foreground font-medium" aria-current="page">
                  {bc.planCrumb}
                </span>
              </nav>
              <div className="min-w-0 flex-1">
                <Suspense fallback={null}>
                  <PlanViewSegmentedNavLazy
                    auditId={auditId}
                    isClient={isClient}
                    active={variant.activePlanView}
                    layout="toolbar"
                  />
                </Suspense>
              </div>
            </div>
            <div className="flex shrink-0 xl:pt-1">
              {!isClient ?
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground h-8 px-3"
                  aria-label={PLAN_WORKSPACE_UI_COPY.planWorkbenchConsultantPrimaryAriaLabel}
                >
                  <Link to={strategyHref} className="no-underline">
                    {PLAN_WORKSPACE_UI_COPY.planWorkbenchConsultantPrimaryLabel}
                  </Link>
                </Button>
              : <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3"
                  aria-label={PLAN_WORKSPACE_UI_COPY.planWorkbenchClientPrimaryAriaLabel}
                >
                  <Link
                    to={
                      isPlanDeliveryBoardUiEnabled() ?
                        buildAppRoute.portalPlan(auditId, 'board')
                      : buildAppRoute.portalPlan(auditId, 'roadmap')
                    }
                    className="no-underline"
                  >
                    {PLAN_WORKSPACE_UI_COPY.planWorkbenchClientPrimaryLabel}
                  </Link>
                </Button>}
            </div>
          </div>
        </div>
      : null}
      {stripVisible && variant.kind === 'plan' ?
        <Collapsible open={planJourneyExpanded} onOpenChange={setPlanJourneyExpanded} className="border-border border-t">
          <div className="flex justify-end px-4 pt-2">
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground h-auto px-2 py-1 text-xs font-semibold">
                {planJourneyExpanded ?
                  STRATEGY_LAB_COPY.journeyStrip.planSurfaceJourneyCollapseHide
                : STRATEGY_LAB_COPY.journeyStrip.planSurfaceJourneyCollapseShow}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent>
            <StrategyJourneyHeader auditId={auditId} isClient={isClient} steps={steps} visible />
          </CollapsibleContent>
        </Collapsible>
      : <StrategyJourneyHeader auditId={auditId} isClient={isClient} steps={steps} visible={stripVisible} />}
    </div>
  );
}
