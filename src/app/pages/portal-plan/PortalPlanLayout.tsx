import type { ReactNode } from 'react';

import { PortalPlanChrome, type PortalPlanChromeProps } from './PortalPlanChrome';

export type PortalPlanLayoutProps = PortalPlanChromeProps & {
  children: ReactNode;
};

/**
 * Shared Plan surface shell: sticky workbench + Board|Roadmap|Table + journey strip, then page body.
 * Used from nested plan workspace routes (`/plan/:id/...`, `/portal/plan/:id/...`); legacy `/roadmap` / `/timeline` redirect there.
 */
export function PortalPlanLayout({ children, ...chrome }: PortalPlanLayoutProps) {
  /**
   * Single column flex subtree so scrollport parents see one measurable child (`flex-1 min-h-0`)
   * instead of a fragment-sibling chrome + body pair (fixes height/scroll chains for Lab studio).
   */
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PortalPlanChrome {...chrome} />
      {children}
    </div>
  );
}
