import { Link, useLocation } from 'react-router';

import { cn } from '../../components/ui/utils';
import { PLAN_WORKSPACE_UI_COPY } from '../../config/plan-workspace-ui-copy.en';
import type { PlanWorkspaceMode } from '../../config/plan-workspace-mode';
import { usePlanWorkspaceMode } from '../../hooks/usePlanWorkspaceMode';
import { buildPlanUrlWithModePreservingForeignParams } from '../../lib/plan-cross-nav';

const MODE_ORDER: readonly PlanWorkspaceMode[] = ['define', 'shape', 'execute'];

function modeLabel(m: PlanWorkspaceMode): string {
  const c = PLAN_WORKSPACE_UI_COPY;
  if (m === 'define') return c.modeBarDefine;
  if (m === 'shape') return c.modeBarShape;
  return c.modeBarExecute;
}

/**
 * Top-level Plan workspace mode control (`?mode=define|shape|execute`) on canonical `/plan` routes.
 */
export function PlanModeBar() {
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
              {modeLabel(m)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
