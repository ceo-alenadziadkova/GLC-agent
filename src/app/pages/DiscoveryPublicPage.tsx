import { useEffect, useRef, useState } from 'react';
import { MapTrifold } from '@phosphor-icons/react';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { DiscoverPage } from './DiscoverPage';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';

export function DiscoveryPublicPage() {
  const [discoveryWide, setDiscoveryWide] = useState(false);
  const discoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!discoveryWide) return;
    discoverRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [discoveryWide]);

  return (
    <MarketingLayout
      showFooter={false}
      breadcrumbs={[
        { label: WORKSPACE_PAGE_COPY.discoveryPublic.breadcrumbHome, to: '/' },
        { label: WORKSPACE_PAGE_COPY.discoveryPublic.breadcrumbDiscovery },
      ]}
    >
      <div
        className={
          discoveryWide
            ? 'relative left-1/2 w-screen max-w-[100vw] min-w-0 -translate-x-1/2'
            : 'mx-auto w-full min-w-0 max-w-5xl'
        }
      >
        <div className="flex min-w-0 flex-col gap-8 mobile:gap-7 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 lg:gap-y-6">
          <div
            className={`order-1 flex flex-col gap-6 text-center mobile:gap-5 lg:order-none lg:text-left ${
              discoveryWide ? 'hidden' : 'lg:col-span-7'
            }`}
          >
            <section
              aria-labelledby="discovery-hero-heading"
              className="flex flex-col items-stretch gap-4 lg:gap-4 lg:border-l-2 lg:border-[color-mix(in_oklab,var(--glc-blue)_45%,var(--border-subtle))] lg:pl-6 mobile:gap-3"
            >
              <div className="flex justify-center lg:justify-start">
                <div className="ds-bg-gradient-badge-blue-orange inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--border-default)] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[var(--tracking-snapshot-badge)] text-[var(--glc-blue)] mobile:text-xs">
                  <MapTrifold className="h-3.5 w-3.5 shrink-0" weight="fill" />
                  {WORKSPACE_PAGE_COPY.discoveryPublic.badge}
                </div>
              </div>

              <h1
                id="discovery-hero-heading"
                className="mx-auto w-full max-w-xl text-balance text-[length:var(--discovery-public-hero-title-size)] font-bold leading-[1.08] text-[var(--text-primary)] [font-family:var(--font-display)] tracking-[var(--tracking-snapshot-hero)] lg:mx-0 lg:tracking-[var(--tracking-snapshot-hero-lg)]"
              >
                {WORKSPACE_PAGE_COPY.discoveryPublic.heroTitle}
              </h1>

              <p className="ds-text-secondary mx-auto max-w-md text-pretty text-[length:var(--snapshot-hero-subtitle-size)] leading-relaxed lg:mx-0 mobile:max-w-none">
                {WORKSPACE_PAGE_COPY.discoveryPublic.heroIntro}
              </p>

              <ul className="mx-auto grid max-w-md gap-2 text-left text-sm leading-relaxed lg:mx-0 lg:max-w-none ds-text-secondary" >
                {WORKSPACE_PAGE_COPY.discoveryPublic.bullets.map(line => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--glc-blue)]" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div
            ref={discoverRef}
            className={`order-2 w-full min-w-0 scroll-mt-28 lg:order-none lg:self-start lg:pt-1 ${
              discoveryWide ? 'lg:col-span-12' : 'lg:col-span-5'
            }`}
          >
            <div
              className={
                discoveryWide
                  ? 'flex w-full min-w-0 max-w-full flex-col overflow-x-hidden border-y border-[var(--border-subtle)] sm:mx-auto sm:max-w-4xl sm:rounded-2xl sm:border sm:border-[color:var(--border-subtle)]'
                  : 'glc-card min-w-0 overflow-hidden rounded-[var(--radius-2xl)] p-6 shadow-[var(--shadow-card)] lg:p-7 mobile:p-5 mobile:shadow-[var(--shadow-snapshot-shell-inner-mobile)]'
              }
            >
              <DiscoverPage
                layout="split"
                embedExpanded={discoveryWide}
                onEmbedExpandRequest={setDiscoveryWide}
              />
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
