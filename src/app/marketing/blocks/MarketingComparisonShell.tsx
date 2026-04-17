import type { ReactNode } from 'react';
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
  /** Inner padding for flush children (e.g. DecisionPath cards). */
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        'ds-marketing-surface-comparison-shell overflow-hidden will-change-transform',
        padded && 'p-4 sm:p-5',
        className,
      )}
    >
      {children}
    </div>
  );
}
