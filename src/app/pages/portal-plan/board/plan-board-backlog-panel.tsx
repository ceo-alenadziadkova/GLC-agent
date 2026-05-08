import type { ReactNode } from 'react';

/**
 * Operational backlog column chrome: stable test id + minimum width inside horizontal column scroller.
 * (Dedicated drawer/sheet breakpoints can extend this wrapper without rewiring DnD targets.)
 */
export function PlanBoardBacklogPanel(props: { isBacklog: boolean; children: ReactNode }) {
  const { isBacklog, children } = props;
  if (!isBacklog) return <>{children}</>;
  return (
    <div data-testid="plan-board-backlog-panel" className="w-[length:var(--portal-plan-backlog-panel-width)] shrink-0">
      {children}
    </div>
  );
}
