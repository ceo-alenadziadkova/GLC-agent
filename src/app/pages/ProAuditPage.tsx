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
import { SnapshotTeaser, BriefTeaser } from '../marketing/blocks/RepeatingTeasers';
import { LOGIN_PATH } from '../marketing/marketing-nav';
import workspacePackaging from '../data/marketing-workspace-packaging.en.json';
import { PACKAGE_MARKETING_OUTCOME_CARD } from '../config/package-marketing-ui';
import { PACKAGE_PAGE_LAYOUT } from '../config/package-page-layout';
import { cn } from '../components/ui/utils';

const TIMELINE = [
  { title: 'Scope alignment', detail: 'Choose 2-3 domains that match your current bottlenecks and objectives.' },
  { title: 'Focused diagnostics', detail: 'Deep checks inside selected domains with cross-signal context.' },
  { title: 'Synthesis', detail: 'Tradeoffs, dependencies, and what to do first vs what can wait.' },
  { title: 'Delivery', detail: 'Action plan with sequencing and handoff-ready recommendations.' },
];

const L = PACKAGE_PAGE_LAYOUT.context;

export function ProAuditPage() {
  const pageCopy = workspacePackaging.package_pages.pro;
  const { quick, strategy } = workspacePackaging.packages;
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
          tier="context"
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
                  <li>Two to three selected domains with focused depth.</li>
                  <li>Dependency notes between selected domains.</li>
                  <li>Impact/effort-based action sequence and next-step options.</li>
                </ul>
              </div>
              <div className="p-6 sm:p-8">
                <h3 className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  Not included
                </h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <li>Complete cross-domain certainty across all six domains.</li>
                  <li>Highest comparability level of Strategy workspace outputs.</li>
                  <li>Strategy confidence of a full end-to-end synthesis run.</li>
                </ul>
              </div>
            </div>
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.08}>
        <div className="rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-10 sm:px-6 sm:py-12">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Business outcome',
                body: 'You reduce decision risk where multiple domains influence one bottleneck.',
              },
              {
                title: 'Planning clarity',
                body: 'Dependencies are explicit, so teams avoid fixing isolated symptoms.',
              },
              {
                title: 'Budget control',
                body: 'You get broader confidence than Focus without full six-domain scope.',
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

      <MarketingSection className={L.sectionGapClass} delay={0.1}>
        <MarketingRevealMask>
          <MarketingComparisonShell padded>
            <ProcessTimeline title="Typical Context flow" steps={TIMELINE} />
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.11}>
        <h2 className="mb-6 font-display text-xl font-bold sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
          Focus vs Context vs Strategy workspace
        </h2>
        <MarketingRevealMask>
          <MarketingComparisonShell>
            <AuditCompare focusedPackage="pro" />
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
          className="mt-14 sm:mt-16"
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
          layout="rail"
          steps={[
            { to: '/starter', label: quick.title, hint: quick.subtitle },
            { to: '/complete', label: strategy.title, hint: strategy.subtitle },
            { to: '/brief', label: 'Book a brief call', hint: 'Get help selecting the right 2-3 domains.', primary: true },
            { to: '/faq', label: 'FAQ', hint: 'Delivery, timelines, and collaboration model.' },
            { to: LOGIN_PATH, label: 'Client sign-in', hint: 'Current workspace reports and progress.' },
          ]}
        />
      </div>

      <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
        If you are unsure which domains to include, start with{' '}
        <Link to="/brief" className="font-semibold" style={{ color: 'var(--glc-blue)' }}>
          Brief
        </Link>
        .
      </p>
    </MarketingLayout>
  );
}
