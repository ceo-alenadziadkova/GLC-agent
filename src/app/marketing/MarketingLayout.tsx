import { useState, type ReactNode } from 'react';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import { LAYOUT_CONTRACTS } from '../../design-system/patterns/Layouts/layout-contracts';
import { cn } from '../components/ui/utils';
import { MarketingBreadcrumbs, type Crumb } from './MarketingBreadcrumbs';
import { MarketingFooter } from './MarketingFooter';
import { MarketingHeader } from './MarketingHeader';
import { PublicBrandProvider } from './PublicBrandContext';

export function MarketingLayout({
  children,
  breadcrumbs,
  showFooter = true,
}: {
  children: ReactNode;
  breadcrumbs?: Crumb[];
  /** When false, only header + main chrome (e.g. Snapshot / Discovery tool pages). */
  showFooter?: boolean;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const skipLabel = WORKSPACE_PAGE_COPY.marketingLayout.skipToMainContent;

  return (
    <PublicBrandProvider>
      <div className="ds-marketing-layout-canvas flex min-h-[100dvh] flex-col">
        <a
          href="#main-content"
          className={cn(
            'ds-marketing-skip-link fixed left-4 top-0 z-[100] -translate-y-full rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-md transition-transform',
            'focus:translate-y-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--glc-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]',
          )}
        >
          {skipLabel}
        </a>
        <MarketingHeader mobileNavOpen={mobileNavOpen} onMobileNavOpenChange={setMobileNavOpen} />
        <div
          className="relative z-10 flex flex-1 flex-col"
          {...(mobileNavOpen ? { inert: true } : {})}
        >
          <main
            id="main-content"
            tabIndex={-1}
            className="flex min-w-0 flex-1 flex-col outline-none"
          >
            <div
              className={cn(
                LAYOUT_CONTRACTS.container.page,
                'flex-1',
                LAYOUT_CONTRACTS.spacing.pageX,
                LAYOUT_CONTRACTS.spacing.pageY,
              )}
            >
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <div className="mb-8 sm:mb-10">
                  <MarketingBreadcrumbs items={breadcrumbs} />
                </div>
              ) : null}
              <div className={LAYOUT_CONTRACTS.spacing.sectionFlow}>{children}</div>
            </div>
          </main>
          {showFooter ? <MarketingFooter /> : null}
        </div>
      </div>
    </PublicBrandProvider>
  );
}
