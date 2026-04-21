import type { ReactNode } from 'react';
import { MARKETING_SURFACE_COMPARISON_SHELL } from '../../config/marketing-surface-tokens';
import { cn } from '../../components/ui/utils';

/**
 * Shared chrome for tier comparison tables and large analytic blocks.
 */
export function MarketingComparisonShell({
  children,
  className,
  padded = false,
}: {
  children: ReactNode;
  className?: string;
  /** Inner padding for flush children (e.g. DecisionPath home rail / cards). */
  padded?: boolean;
}) {
  return (
    <div
      className={cn('overflow-hidden will-change-transform', padded && 'p-4 sm:p-5', className)}
      style={MARKETING_SURFACE_COMPARISON_SHELL}
    >
      {children}
    </div>
  );
}
