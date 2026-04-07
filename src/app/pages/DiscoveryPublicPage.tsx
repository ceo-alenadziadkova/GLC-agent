import { MapTrifold } from '@phosphor-icons/react';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { DiscoverPage } from './DiscoverPage';

export function DiscoveryPublicPage() {
  return (
    <MarketingLayout
      showFooter={false}
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: 'Discovery' },
      ]}
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex flex-col gap-8 mobile:gap-7 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 lg:gap-y-6">
          <div className="order-1 flex flex-col gap-6 text-center lg:order-none lg:col-span-7 lg:text-left mobile:gap-5">
            <section
              aria-labelledby="discovery-hero-heading"
              className="flex flex-col items-stretch gap-4 lg:gap-4 lg:border-l-2 lg:border-[color-mix(in_oklab,var(--glc-blue)_45%,var(--border-subtle))] lg:pl-6 mobile:gap-3"
            >
              <div className="flex justify-center lg:justify-start">
                <div
                  className="inline-flex max-w-full items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide mobile:text-[11px]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(28,189,255,0.12) 0%, rgba(242,79,29,0.08) 100%)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--glc-blue)',
                    letterSpacing: '0.06em',
                  }}
                >
                  <MapTrifold className="h-3.5 w-3.5 shrink-0" weight="fill" />
                  No URL required
                </div>
              </div>

              <h1
                id="discovery-hero-heading"
                className="mx-auto w-full max-w-xl text-balance tracking-[-0.025em] lg:mx-0 lg:tracking-[-0.035em]"
                style={{
                  fontSize: 'clamp(1.75rem, 5vw, 2.75rem)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  lineHeight: 1.08,
                }}
              >
                Clarify your digital next step before a big build
              </h1>

              <p
                className="mx-auto max-w-md text-pretty leading-relaxed lg:mx-0 mobile:max-w-none"
                style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.8125rem, 2.85vw, 0.975rem)' }}
              >
                When there is no public site, the brief is fuzzy, or the structure is unclear—Discovery is a structured
                questionnaire. We map channels, maturity, and priorities so you see a clear path: audit, site strategy,
                or implementation—without committing to a large project upfront.
              </p>

              <ul className="mx-auto grid max-w-md gap-2 text-left text-sm leading-relaxed lg:mx-0 lg:max-w-none" style={{ color: 'var(--text-secondary)' }}>
                {[
                  'Good for launches, rebrands, or “we need something digital” with no live site.',
                  'Takes a few minutes; no account required to see your findings.',
                  'Afterwards you can register and carry answers into the full audit.',
                ].map(line => (
                  <li key={line} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: 'var(--glc-blue)' }} />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="order-2 w-full lg:order-none lg:col-span-5 lg:self-start lg:pt-1">
            <div
              className="glc-card p-6 lg:p-7 mobile:p-5 mobile:shadow-[0_12px_40px_rgba(0,0,0,0.14)]"
              style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}
            >
              <DiscoverPage layout="split" />
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
