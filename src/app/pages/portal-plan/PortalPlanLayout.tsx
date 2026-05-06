import type { ReactNode } from 'react';

import { PortalPlanChrome, type PortalPlanChromeProps } from './PortalPlanChrome';

export type PortalPlanLayoutProps = PortalPlanChromeProps & {
  children: ReactNode;
};

/**
 * Shared Plan surface shell: sticky workbench + Board|Roadmap|Table + journey strip, then page body.
 * Used from `PortalPlanPage` (canonical `/plan` / `/portal/plan`); legacy `/roadmap` / `/timeline` redirect there.
 */
export function PortalPlanLayout({ children, ...chrome }: PortalPlanLayoutProps) {
  return (
    <>
      <PortalPlanChrome {...chrome} />
      {children}
    </>
  );
}
