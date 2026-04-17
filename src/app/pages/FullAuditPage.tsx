import { Link } from 'react-router';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { AuditCompare } from '../marketing/blocks/AuditCompare';
import { MarketingComparisonShell } from '../marketing/blocks/MarketingComparisonShell';
import { MarketingMidCtaBand } from '../marketing/blocks/MarketingMidCtaBand';
import { MarketingRevealMask } from '../marketing/blocks/MarketingRevealMask';
import { PackageMarketingHero } from '../marketing/blocks/PackageMarketingHero';
import { ProcessTimeline } from '../marketing/blocks/ProcessTimeline';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { SnapshotTeaser, BriefTeaser } from '../marketing/blocks/RepeatingTeasers';
import { LOGIN_PATH } from '../marketing/marketing-nav';
import workspacePackaging from '../data/marketing-workspace-packaging.en.json';
import { PACKAGE_MARKETING_OUTCOME_CARD } from '../config/package-marketing-ui';
import { PACKAGE_PAGE_LAYOUT } from '../config/package-page-layout';
import { cn } from '../components/ui/utils';

const TIMELINE = [
  { title: 'Context and goals', detail: 'Brief, expectations, constraints, ownership.' },
  { title: 'Diagnostics', detail: 'Site and UX, digital footprint, processes, integrations, communications.' },
  { title: 'Synthesis', detail: 'Bottlenecks, risks, automation opportunities.' },
  { title: 'Deliverables', detail: 'Impact / effort prioritization, roadmap, implementation options with or without us.' },
];

const L = PACKAGE_PAGE_LAYOUT.strategy;

export function FullAuditPage() {
  const pageCopy = workspacePackaging.package_pages.complete;
  const { quick, full, strategy } = workspacePackaging.packages;
  const homePack = workspacePackaging.marketing_home;
  const labels = workspacePackaging.package_page_labels;
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
          tier="strategy"
          eyebrow={pageCopy.breadcrumb}
          title={pageCopy.h1}
          lead={pageCopy.lead}
          heroPaddingClassName={L.heroShellClass}
        />
      </MarketingSection>

      <MarketingSection
        className="-mx-4 mt-12 rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-4 py-14 sm:-mx-6 sm:mt-16 sm:px-6 sm:py-16"
        delay={0.04}
      >
        <h2 className="font-display text-xl font-bold sm:text-2xl ds-text-primary" >
          Included domains
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            'Tech infrastructure',
            'Security and compliance',
            'SEO and digital visibility',
            'UX and conversion',
            'Marketing and positioning',
            'Automation and processes',
          ].map(line => (
            <div
              key={line}
              className="rounded-[var(--radius-xl)] border px-4 py-3 text-sm leading-relaxed shadow-[var(--shadow-xs)] transition-[transform,background-color] duration-200 ease-out hover:scale-[1.02]"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'color-mix(in oklab, var(--glc-blue-muted) 78%, var(--bg-surface))',
              }}
            >
              {line}
            </div>
          ))}
        </div>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.06}>
        <h2 className="mb-6 font-display text-xl font-bold sm:text-2xl ds-text-primary" >
          Package semantics
        </h2>
        <MarketingRevealMask>
          <MarketingComparisonShell padded>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [quick.title, `${quick.subtitle}. One selected domain—fast scoped output with clear action points.`],
                [full.title, `${full.subtitle}. Two to three domains—stronger cross-signal and tradeoff context.`],
                [strategy.title, `${strategy.subtitle}. All six domains—full synthesis and highest comparability.`],
                ['Coverage note', 'Every workspace output marks covered and not-analyzed domains.'],
              ].map(([t, b]) => (
                <div
                  key={t}
                  className="relative rounded-[var(--radius-xl)] border p-5"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    background:
                      'linear-gradient(165deg, var(--bg-surface) 0%, color-mix(in oklab, var(--bg-muted) 65%, var(--bg-surface)) 100%)',
                    boxShadow: 'var(--shadow-xs)',
                  }}
                >
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--glc-blue-light)' }}>
                    {t}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed ds-text-primary" >
                    {b}
                  </p>
                </div>
              ))}
            </div>
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection
        className={cn(L.sectionGapClass, 'rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-12 sm:px-6 sm:py-14')}
        delay={0.07}
      >
        <h2 className="font-display text-xl font-bold sm:text-2xl ds-text-primary" >
          Deliverables
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed ds-text-secondary" >
          <li>Structured workspace output with explicit coverage and comparability notes.</li>
          <li>Cross-domain synthesis across all six domains (strongest comparability baseline).</li>
          <li>Priority matrix (impact / effort) and roadmap.</li>
          <li>Implementation options: GLC support or handoff to your team / partners.</li>
        </ul>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.08}>
        <div className="rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-10 sm:px-6 sm:py-12">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Executive confidence',
                body: 'Complete six-domain view reduces blind spots in strategic decisions.',
              },
              {
                title: 'Cross-team alignment',
                body: 'One shared roadmap helps product, marketing, and operations move in one direction.',
              },
              {
                title: 'Implementation readiness',
                body: 'Prioritized actions are structured for immediate execution and tracking.',
              },
            ].map(item => (
              <article key={item.title} className="p-5 sm:p-6" style={PACKAGE_MARKETING_OUTCOME_CARD}>
                <h3 className="font-display text-base font-bold ds-text-primary" >
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed ds-text-secondary" >
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.1}>
        <MarketingRevealMask>
          <MarketingComparisonShell padded>
            <ProcessTimeline title="Typical process" steps={TIMELINE} />
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.11}>
        <h2 className="mb-6 font-display text-xl font-bold sm:text-2xl ds-text-primary" >
          Focus vs Context vs Strategy workspace
        </h2>
        <MarketingRevealMask>
          <MarketingComparisonShell>
            <AuditCompare emphasisColumn="strategy" />
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
          className="mt-16 sm:mt-20"
        />
      </MarketingSection>

      <div className={cn('grid gap-6 md:grid-cols-2', L.sectionGapClass)}>
        <SnapshotTeaser />
        <BriefTeaser />
      </div>

      <div className={L.sectionGapClass}>
        <NextStepsCta
          title={next.title}
          subtitle={next.subtitle}
          steps={[
            { to: '/starter', label: quick.title, hint: quick.subtitle },
            { to: '/pro', label: full.title, hint: full.subtitle },
            { to: '/brief', label: labels.bookBriefLabel, hint: labels.bookBriefHintComplete, primary: true },
            { to: '/faq', label: labels.faqLabel, hint: 'Delivery, timelines, collaboration.' },
            { to: LOGIN_PATH, label: labels.clientSignInLabel, hint: 'Current reports and stages.' },
          ]}
        />
      </div>

      <p className="mt-8 text-center text-sm ds-text-tertiary" >
        {labels.completeHintPrefix}{' '}
        <Link to="/discovery" className="font-semibold ds-text-brand" >
          Discovery
        </Link>
        .
      </p>
    </MarketingLayout>
  );
}
