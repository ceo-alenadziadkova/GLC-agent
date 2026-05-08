import { Suspense, lazy } from 'react';
import { Link } from 'react-router';
import { CaretRight, DotsThreeVertical } from '@phosphor-icons/react';

import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import { ORCHESTRATION_IA_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { primaryPlanWorkbenchViewForStrategyLinks } from '../../config/plan-delivery-board-ui';
import type { AuditState } from '../../data/audit/contracts/state/audit-state.types';
import { usePlanWorkspaceMode } from '../../hooks/usePlanWorkspaceMode';
import { buildPlanWorkspaceHref } from '../../lib/plan-cross-nav';
import type { StrategyJourneyStepComputed } from '../../lib/strategy-journey-status';
import { Button } from '../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { cn } from '../../components/ui/utils';
import { useOptionalPlanAdvancedDrawer } from '../../context/PlanAdvancedDrawerContext';
import type { PlanViewSegmentActive } from './PlanViewSegmentedNav';
import { PlanModeBar, type PlanModeVisualStatus } from './PlanModeBar';
import { StrategyJourneyHeader } from './StrategyJourneyHeader';

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
  /** When true on `variant.kind === 'plan'`, hide Board / Roadmap / Table tabs (Define / Shape studio). */
  hideExecuteViewTabs?: boolean;
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
  hideExecuteViewTabs = false,
}: StrategyPlanningChromeProps) {
  const { mode: planWorkspaceMode } = usePlanWorkspaceMode();
  const planAdvancedDrawer = useOptionalPlanAdvancedDrawer();
  const showPlanStudioAdvancedOverflow =
    variant.kind === 'plan' && hideExecuteViewTabs && !isClient && planAdvancedDrawer?.hasAdvancedContent === true;
  const orchestrationUiEnabled = APP_FEATURE_FLAGS.orchestrationRoadmapUiEnabled;
  /** Strategy Lab historically always shows the strip when the sticky chrome mounts; Plan surfaces wait until strategy exists. */
  const stripVisible =
    variant.kind === 'strategy-lab' ? true : Boolean(orchestrationUiEnabled && audit?.strategy);
  const planShapeHref = buildPlanWorkspaceHref({ auditId, isClient, mode: 'shape' });
  const planExecuteHref = buildPlanWorkspaceHref({
    auditId,
    isClient,
    mode: 'execute',
    view: primaryPlanWorkbenchViewForStrategyLinks(),
  });
  const bc = STRATEGY_LAB_COPY.planSurfaceBreadcrumb;
  const contextStep = steps.find((s) => s.id === 'context')?.status ?? 'pending';
  const manifestStep = steps.find((s) => s.id === 'manifest')?.status ?? 'pending';
  const packStep = steps.find((s) => s.id === 'pack')?.status ?? 'pending';
  const planStep = steps.find((s) => s.id === 'plan')?.status ?? 'pending';

  const modeStatuses: Record<'define' | 'shape' | 'execute', PlanModeVisualStatus> = {
    define:
      contextStep === 'done'
        ? 'done'
        : planWorkspaceMode === 'define'
          ? 'current'
          : 'pending',
    shape:
      manifestStep === 'done' && packStep === 'done'
        ? 'done'
        : planWorkspaceMode === 'shape' || manifestStep === 'current' || packStep === 'current'
          ? 'current'
          : 'pending',
    execute:
      planWorkspaceMode === 'execute'
        ? 'current'
        : planStep === 'current' || planStep === 'done'
          ? 'done'
          : 'pending',
  };

  return (
    <div className="bg-card border-border divide-border sticky top-0 z-[15] divide-y border-b">
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
                to={planShapeHref}
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
        <>
          <PlanModeBar statuses={modeStatuses} />
          <div className="px-4 py-2 pb-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between xl:gap-4">
              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                {!hideExecuteViewTabs && planWorkspaceMode === 'execute' ? (
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
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-1 xl:pt-1">
                {showPlanStudioAdvancedOverflow && planAdvancedDrawer ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground h-8 w-8 shrink-0 p-0"
                        aria-label={PLAN_WORKSPACE_UI_COPY.advancedDrawerOverflowTriggerAriaLabel}
                      >
                        <DotsThreeVertical className="h-5 w-5" weight="bold" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[12rem]" collisionPadding={8}>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onSelect={() => {
                          planAdvancedDrawer.setOpen(true);
                        }}
                      >
                        {PLAN_WORKSPACE_UI_COPY.advancedDrawerMenuLabel}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
                {!isClient ?
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground h-8 px-3"
                    aria-label={PLAN_WORKSPACE_UI_COPY.planWorkbenchConsultantPrimaryAriaLabel}
                  >
                    <Link to={planShapeHref} className="no-underline">
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
                    <Link to={planExecuteHref} className="no-underline">
                      {PLAN_WORKSPACE_UI_COPY.planWorkbenchClientPrimaryLabel}
                    </Link>
                  </Button>}
              </div>
            </div>
          </div>
        </>
      : <>
          <PlanModeBar statuses={modeStatuses} />
        </>}
      <StrategyJourneyHeader auditId={auditId} isClient={isClient} steps={steps} visible={stripVisible} />
    </div>
  );
}
