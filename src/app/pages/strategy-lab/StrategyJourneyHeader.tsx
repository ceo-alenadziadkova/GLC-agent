import { useId } from 'react';
import { Link } from 'react-router';
import { Check } from '@phosphor-icons/react';

import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { STRATEGY_LAB_PAGE_ANCHORS } from '../../config/strategy-lab';
import { primaryPlanWorkbenchViewForStrategyLinks } from '../../config/plan-delivery-board-ui';
import { buildAppRoute } from '../../config/route-paths';
import { cn } from '../../components/ui/utils';
import type { StrategyJourneyStepComputed, StrategyJourneyStepId } from '../../lib/strategy-journey-status';

function stepCopy(id: StrategyJourneyStepId): { title: string; hint: string } {
  const j = STRATEGY_LAB_COPY.journeyStrip;
  switch (id) {
    case 'context':
      return { title: j.step1Title, hint: j.step1Hint };
    case 'manifest':
      return { title: j.step2Title, hint: j.step2Hint };
    case 'pack':
      return { title: j.step3Title, hint: j.step3Hint };
    case 'plan':
      return { title: j.step4Title, hint: j.step4Hint };
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function strategyLabStepTo(
  id: StrategyJourneyStepId,
  auditId: string,
  isClient: boolean,
): { pathname: string; hash?: string } | null {
  if (id === 'plan') return null;
  const pathname = isClient ? buildAppRoute.portalStrategy(auditId) : buildAppRoute.strategy(auditId);
  const hashKey =
    id === 'context'
      ? STRATEGY_LAB_PAGE_ANCHORS.definePhase
      : id === 'manifest'
        ? STRATEGY_LAB_PAGE_ANCHORS.planSetup
        : STRATEGY_LAB_PAGE_ANCHORS.shapePack;
  return { pathname, hash: `#${hashKey}` };
}

export type StrategyJourneyHeaderProps = {
  auditId: string;
  isClient: boolean;
  /** Precomputed step statuses (shared with Plan chrome when audit is loaded). */
  steps: ReadonlyArray<StrategyJourneyStepComputed>;
  /** When false, render nothing (e.g. client portal profile). */
  visible: boolean;
};

/**
 * Four-step planning journey (Context → Manifest → Pack → Plan): single IA header shared by Strategy Lab and Plan surfaces.
 * Plan step enters the roadmap schedule hub; Timeline vs roadmap lives under Plan segmented control.
 */
export function StrategyJourneyHeader({ auditId, isClient, steps, visible }: StrategyJourneyHeaderProps) {
  const descriptionId = useId();
  const planView = primaryPlanWorkbenchViewForStrategyLinks();
  const planEntryHref = isClient
    ? buildAppRoute.portalPlan(auditId, planView)
    : buildAppRoute.plan(auditId, planView);

  if (!visible) return null;

  const copy = STRATEGY_LAB_COPY.journeyStrip;

  return (
    <nav aria-label={copy.ariaLabel} className="px-4 py-3">
      <p id={descriptionId} className="sr-only">
        {copy.description}
      </p>
      <ol className="flex flex-wrap items-stretch gap-3 sm:flex-nowrap" aria-describedby={descriptionId}>
        {steps.map((step, index) => {
          const { title, hint } = stepCopy(step.id);
          const isDone = step.status === 'done';
          const isCurrent = step.status === 'current';
          const statusLabel = isDone ? copy.statusDone : isCurrent ? copy.statusCurrent : copy.statusPending;

          const strategyStepTo = strategyLabStepTo(step.id, auditId, isClient);
          const content = (
            <>
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                  isDone
                    ? 'bg-success text-white'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                )}
              >
                {isDone ? <Check className="h-3.5 w-3.5" weight="bold" /> : index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="text-foreground text-sm font-semibold">{title}</span>
                  <span
                    className={cn(
                      'text-[length:var(--text-2xs)] font-mono uppercase tracking-wide',
                      isDone ? 'text-success' : isCurrent ? 'text-primary' : 'text-muted-foreground',
                    )}
                  >
                    {statusLabel}
                  </span>
                </span>
                <span className="text-muted-foreground mt-0.5 block max-w-prose text-xs leading-snug">{hint}</span>
              </span>
            </>
          );

          if (step.id === 'plan') {
            return (
              <li
                key={step.id}
                className="min-w-[length:var(--strategy-lab-steps-strip-min-width,12rem)] flex-1"
              >
                <Link
                  to={planEntryHref}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'group flex h-full items-start gap-3 rounded-lg border px-3 py-2 transition-colors no-underline',
                    isCurrent
                      ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                      : isDone
                        ? 'border-border bg-card'
                        : 'border-dashed border-border bg-card opacity-80',
                  )}
                >
                  {content}
                </Link>
              </li>
            );
          }

          return (
            <li key={step.id} className="min-w-[length:var(--strategy-lab-steps-strip-min-width,12rem)] flex-1">
              <Link
                to={strategyStepTo!}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'group flex h-full items-start gap-3 rounded-lg border px-3 py-2 transition-colors no-underline',
                  isCurrent
                    ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                    : isDone
                      ? 'border-border bg-card'
                      : 'border-dashed border-border bg-card opacity-80',
                )}
              >
                {content}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
