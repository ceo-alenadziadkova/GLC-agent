import { useLayoutEffect, useState, type ReactNode } from 'react';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import { GLC_THEME_STORAGE_KEY, setGlcColorScheme } from '../lib/glc-theme';
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

  /** Marketing surfaces: fixed dark chrome; restore saved preference when leaving (theme toggle hidden for now). */
  useLayoutEffect(() => {
    const raw = localStorage.getItem(GLC_THEME_STORAGE_KEY);
    setGlcColorScheme('dark');
    return () => {
      if (raw === 'light' || raw === 'dark') {
        setGlcColorScheme(raw);
      } else {
        setGlcColorScheme('system');
      }
    };
  }, []);

  return (
    <PublicBrandProvider>
      <div className="flex min-h-[100dvh] flex-col" style={{ backgroundColor: 'var(--bg-canvas)' }}>
        <a
          href="#main-content"
          className={cn(
            'fixed left-4 top-0 z-[100] -translate-y-full rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-md transition-transform',
            'focus:translate-y-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--glc-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-canvas)]',
          )}
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)',
          }}
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
            <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 sm:py-16 md:py-20">
              {breadcrumbs && breadcrumbs.length > 0 ? (
                <div className="mb-8 sm:mb-10">
                  <MarketingBreadcrumbs items={breadcrumbs} />
                </div>
              ) : null}
              <div className="flex flex-col gap-14 sm:gap-20 lg:gap-24">{children}</div>
            </div>
          </main>
          {showFooter ? <MarketingFooter /> : null}
        </div>
      </div>
    </PublicBrandProvider>
  );
}
