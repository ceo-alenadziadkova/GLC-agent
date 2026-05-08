import { Link, useLocation } from 'react-router';

import { cn } from '../../components/ui/utils';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import type { PlanWorkspaceMode } from '../../config/plan-workspace-mode';
import { usePlanWorkspaceMode } from '../../hooks/usePlanWorkspaceMode';
import { buildPlanUrlWithModePreservingForeignParams } from '../../lib/plan-cross-nav';

const MODE_ORDER: readonly PlanWorkspaceMode[] = ['define', 'shape', 'execute'];
export type PlanModeVisualStatus = 'done' | 'current' | 'pending';

type PlanModeBarProps = {
  statuses?: Partial<Record<PlanWorkspaceMode, PlanModeVisualStatus>>;
};

function modeLabel(m: PlanWorkspaceMode): string {
  const c = PLAN_WORKSPACE_UI_COPY;
  if (m === 'define') return c.modeBarDefine;
  if (m === 'shape') return c.modeBarShape;
  return c.modeBarExecute;
}

function modeStatusGlyph(status: PlanModeVisualStatus): string {
  if (status === 'done') return '✓';
  if (status === 'current') return '•';
  return '○';
}

/**
 * Top-level Plan workspace mode control (`?mode=define|shape|execute`) on canonical `/plan` routes.
 */
export function PlanModeBar({ statuses }: PlanModeBarProps) {
  const location = useLocation();
  const { mode } = usePlanWorkspaceMode();

  return (
    <nav aria-label={PLAN_WORKSPACE_UI_COPY.modeBarAriaLabel} className="px-4 pb-2">
      <div
        role="tablist"
        className="bg-muted text-muted-foreground inline-flex max-w-full flex-wrap gap-1 rounded-lg border border-border p-1"
      >
        {MODE_ORDER.map(m => {
          const to = buildPlanUrlWithModePreservingForeignParams({
            pathname: location.pathname,
            currentSearch: location.search,
            nextMode: m,
          });
          const active = mode === m;
          const status = statuses?.[m] ?? (active ? 'current' : 'pending');
          return (
            <Link
              key={m}
              role="tab"
              aria-selected={active}
              to={to}
              className={cn(
                'focus-visible:ring-ring rounded-md px-3 py-1.5 text-xs font-semibold no-underline outline-none transition-colors sm:text-sm',
                active
                  ? 'bg-card text-foreground shadow-sm ring-1 ring-primary/25'
                  : 'text-muted-foreground hover:bg-background/70 hover:text-foreground',
              )}
            >
              <span>{modeLabel(m)}</span>
              <span
                aria-hidden
                className={cn(
                  'ml-2 inline-block text-[length:var(--strategy-lab-mode-glyph-font-size)] leading-none',
                  status === 'done'
                    ? 'text-emerald-600'
                    : status === 'current'
                      ? 'text-primary'
                      : 'text-muted-foreground/70',
                )}
              >
                {modeStatusGlyph(status)}
              </span>
              <span
                aria-hidden
                className={cn(
                  'ml-2 inline-block h-1.5 w-1.5 rounded-full align-middle',
                  status === 'done'
                    ? 'bg-emerald-500'
                    : status === 'current'
                      ? 'bg-primary'
                      : 'bg-muted-foreground/40',
                )}
              />
              <span className="sr-only">
                {status === 'done'
                  ? PLAN_WORKSPACE_UI_COPY.modeBarStatusDone
                  : status === 'current'
                    ? PLAN_WORKSPACE_UI_COPY.modeBarStatusCurrent
                    : PLAN_WORKSPACE_UI_COPY.modeBarStatusPending}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
