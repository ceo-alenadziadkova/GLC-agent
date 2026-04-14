import { Link } from 'react-router';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { AuditCompare } from '../marketing/blocks/AuditCompare';
import { MarketingComparisonShell } from '../marketing/blocks/MarketingComparisonShell';
import { MarketingMidCtaBand } from '../marketing/blocks/MarketingMidCtaBand';
import { MarketingRevealMask } from '../marketing/blocks/MarketingRevealMask';
import { PackageMarketingHero } from '../marketing/blocks/PackageMarketingHero';
import { PackageAudienceSection } from '../marketing/blocks/PackageAudienceSection';
import { ProcessTimeline } from '../marketing/blocks/ProcessTimeline';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { SnapshotTeaser, DiscoveryTeaser } from '../marketing/blocks/RepeatingTeasers';
import { LOGIN_PATH } from '../marketing/marketing-nav';
import workspacePackaging from '../data/marketing-workspace-packaging.en.json';
import { PACKAGE_MARKETING_OUTCOME_CARD } from '../config/package-marketing-ui';
import { PACKAGE_PAGE_LAYOUT } from '../config/package-page-layout';
import { cn } from '../components/ui/utils';

const TIMELINE = [
  { title: 'Kickoff', detail: 'Short brief or scope alignment—without drowning in detail.' },
  { title: 'Signal gathering', detail: 'Site, key pages, baseline process questions within agreed volume.' },
  { title: 'Findings', detail: 'Priorities, risks, quick wins, and recommended next step.' },
  { title: 'Delivery', detail: 'Structured report you can use internally or with a vendor.' },
];

const L = PACKAGE_PAGE_LAYOUT.focus;

export function ExpressAuditPage() {
  const pageCopy = workspacePackaging.package_pages.starter;
  const homePack = workspacePackaging.marketing_home;
  const mid = pageCopy.mid_cta ?? homePack.mid_page_cta;
  const next = pageCopy.next_steps ?? homePack.next_steps;

  return (
    <MarketingLayout
      breadcrumbs={[
        { label: 'Home', to: '/' },
        { label: pageCopy.breadcrumb },
      ]}
    >
      <MarketingSection className="scroll-mt-24">
        <PackageMarketingHero
          tier="focus"
          eyebrow={pageCopy.breadcrumb}
          title={pageCopy.h1}
          lead={pageCopy.lead}
          heroPaddingClassName={L.heroShellClass}
        />
      </MarketingSection>

      <MarketingSection delay={0.04}>
        <PackageAudienceSection title={pageCopy.audience.title} cards={pageCopy.audience.cards} />
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.06}>
        <MarketingRevealMask>
          <MarketingComparisonShell>
            <div className="grid divide-y divide-[var(--border-subtle)] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <div className="p-6 sm:p-8">
                <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Included
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li>One selected domain with detailed findings.</li>
                  <li>Quick wins and priority guidance for that domain.</li>
                  <li>Coverage disclosure in the report.</li>
                </ul>
              </div>
              <div className="p-6 sm:p-8">
                <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Not included
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li>Cross-domain synthesis confidence of a complete audit.</li>
                  <li>Equal-score comparability with complete 6-domain audits.</li>
                  <li>Multi-domain dependency certainty outside selected scope.</li>
                </ul>
              </div>
            </div>
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.07}>
        <h2 className="font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Outcome and timing
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Timelines depend on context; Starter is typically the shortest paid path. Deliverable includes conclusions,
          next steps, and explicit coverage boundaries.
        </p>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.08}>
        <div className="rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-8 sm:px-6 sm:py-10">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Business outcome',
                body: 'You get one clear priority track instead of scattered fixes across teams.',
              },
              {
                title: 'Decision confidence',
                body: 'You know where Focus is enough and where you should expand to Context or Strategy workspace.',
              },
              {
                title: 'Execution handoff',
                body: 'Report format is ready for internal execution or transfer to another vendor.',
              },
            ].map(item => (
              <article key={item.title} className="p-5 sm:p-6" style={PACKAGE_MARKETING_OUTCOME_CARD}>
                <h3 className="font-display text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.09}>
        <h2 className="mb-6 font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          From signal to decision
        </h2>
        <MarketingRevealMask>
          <MarketingComparisonShell padded>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Signal', 'What the business and users see.'],
                ['Bottlenecks', 'Friction, loss, risk.'],
                ['Recommendations', 'What to change and in what order within Starter.'],
                ['Next step', 'Scale to Pro/Complete or go directly into implementation.'],
              ].map(([t, d]) => (
                <div
                  key={t}
                  className="rounded-[var(--radius-xl)] border p-4 text-center"
                  style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'color-mix(in oklab, var(--bg-surface) 88%, var(--bg-muted))' }}
                >
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--glc-blue)' }}>
                    {t}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {d}
                  </p>
                </div>
              ))}
            </div>
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.1}>
        <MarketingRevealMask>
          <MarketingComparisonShell padded>
            <ProcessTimeline title="Typical process" steps={TIMELINE} />
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.11}>
        <h2 className="mb-6 font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          When Focus is enough vs when you need Context or Strategy workspace
        </h2>
        <MarketingRevealMask>
          <MarketingComparisonShell>
            <AuditCompare focusedPackage="starter" />
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className="mt-0" delay={0.12}>
        <MarketingMidCtaBand
          landmarkLabel={homePack.landmarks.mid_cta}
          title={mid.title}
          body={mid.body}
          ctaLabel={mid.cta_label}
          ctaTo={mid.cta_to}
          className="mt-10 sm:mt-14"
        />
      </MarketingSection>

      <div className={cn('grid gap-6 md:grid-cols-2', L.sectionGapClass)}>
        <SnapshotTeaser />
        <DiscoveryTeaser />
      </div>

      <div className={L.sectionGapClass}>
        <NextStepsCta
          title={next.title}
          subtitle={next.subtitle}
          layout="compact-grid"
          steps={[
            { to: '/pro', label: workspacePackaging.packages.full.title, hint: workspacePackaging.packages.full.subtitle },
            { to: '/complete', label: workspacePackaging.packages.strategy.title, hint: workspacePackaging.packages.strategy.subtitle },
            { to: '/faq', label: 'FAQ', hint: 'Timelines, communication, delivery.' },
            { to: '/brief', label: 'Book a brief call', hint: 'We match the format to your context.', primary: true },
            { to: LOGIN_PATH, label: 'Client sign-in', hint: 'Reports and progress.' },
          ]}
        />
      </div>

      <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        Still unsure? Start with{' '}
        <Link to="/snapshot" className="font-semibold" style={{ color: 'var(--glc-blue)' }}>
          Snapshot
        </Link>
        .
      </p>
    </MarketingLayout>
  );
}
