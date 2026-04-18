import { Link } from 'react-router';
import {
  Check,
  Shield,
  MagnifyingGlass,
  Lightning,
  Cube,
  Megaphone,
  Gear,
  Crown,
  UsersThree,
  Rocket,
} from '@phosphor-icons/react';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { AuditCompare } from '../marketing/blocks/AuditCompare';
import { MarketingComparisonShell } from '../marketing/blocks/MarketingComparisonShell';
import { MarketingMidCtaBand } from '../marketing/blocks/MarketingMidCtaBand';
import { MarketingRevealMask } from '../marketing/blocks/MarketingRevealMask';
import { MarketingStaggeredReveal } from '../marketing/blocks/MarketingStaggeredReveal';
import { PackageMarketingHero } from '../marketing/blocks/PackageMarketingHero';
import { ProcessTimeline } from '../marketing/blocks/ProcessTimeline';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { SnapshotTeaser, BriefTeaser } from '../marketing/blocks/RepeatingTeasers';
import { LOGIN_PATH } from '../marketing/marketing-nav';
import workspacePackaging from '../data/marketing-workspace-packaging.en.json';
import { PACKAGE_PAGE_LAYOUT } from '../config/package-page-layout';
import { cn } from '../components/ui/utils';

const TIMELINE = [
  { title: 'Context and goals', detail: 'Brief, expectations, constraints, ownership.' },
  { title: 'Diagnostics', detail: 'Site and UX, digital footprint, processes, integrations, communications.' },
  { title: 'Synthesis', detail: 'Bottlenecks, risks, automation opportunities.' },
  { title: 'Deliverables', detail: 'Impact / effort prioritization, roadmap, implementation options with or without us.' },
];

const DOMAIN_CHIPS = [
  { label: 'Tech infrastructure', Icon: Cube },
  { label: 'Security and compliance', Icon: Shield },
  { label: 'SEO and digital visibility', Icon: MagnifyingGlass },
  { label: 'UX and conversion', Icon: Lightning },
  { label: 'Marketing and positioning', Icon: Megaphone },
  { label: 'Automation and processes', Icon: Gear },
] as const;

const OUTCOMES = [
  { title: 'Executive confidence', body: 'Complete six-domain view reduces blind spots in strategic decisions.', Icon: Crown },
  { title: 'Cross-team alignment', body: 'One shared roadmap helps product, marketing, and operations move in one direction.', Icon: UsersThree },
  { title: 'Implementation readiness', body: 'Prioritized actions are structured for immediate execution and tracking.', Icon: Rocket },
] as const;

const DELIVERABLES = [
  'Structured workspace output with explicit coverage and comparability notes.',
  'Cross-domain synthesis across all six domains (strongest comparability baseline).',
  'Priority matrix (impact / effort) and roadmap.',
  'Implementation options: GLC support or handoff to your team / partners.',
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
          heroTitleScaleClassName={L.heroTitleScaleClass}
          accentEyebrow
        />
      </MarketingSection>

      <MarketingSection
        className="-mx-4 rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-4 py-14 sm:-mx-6 sm:px-6 sm:py-16"
        delay={0.04}
      >
        <h2 className="ds-marketing-section-title-display">Included domains</h2>
        <MarketingStaggeredReveal className="mt-8 grid gap-4 sm:grid-cols-2">
          {DOMAIN_CHIPS.map(({ label, Icon }) => (
            <MarketingStaggeredReveal.Item
              key={label}
              className="flex items-center gap-3 rounded-[var(--radius-xl)] border px-4 py-3 text-sm leading-relaxed shadow-[var(--shadow-xs)] transition-[transform,background-color,border-color] duration-200 ease-out hover:-translate-y-0.5 ds-full-audit-domain-chip"
            >
              <span className="ds-marketing-card-icon-well ds-marketing-card-icon-well--small" aria-hidden>
                <Icon size={18} weight="bold" aria-hidden />
              </span>
              <span className="font-semibold">{label}</span>
            </MarketingStaggeredReveal.Item>
          ))}
        </MarketingStaggeredReveal>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.06}>
        <h2 className="mb-6 ds-marketing-section-title-display">
          Package semantics
        </h2>
        <MarketingRevealMask>
          <MarketingComparisonShell padded variant="elevated">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [quick.title, `${quick.subtitle}. One selected domain—fast scoped output with clear action points.`],
                [full.title, `${full.subtitle}. Two to three domains—stronger cross-signal and tradeoff context.`],
                [strategy.title, `${strategy.subtitle}. All six domains—full synthesis and highest comparability.`],
                ['Coverage note', 'Every workspace output marks covered and not-analyzed domains.'],
              ].map(([t, b]) => (
                <div key={t} className="relative rounded-[var(--radius-xl)] border p-5 ds-full-audit-tier-card">
                  <p className="text-xs font-bold uppercase tracking-wide ds-text-glc-blue-light">
                    {t}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed ds-text-primary">
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
        <h2 className="ds-marketing-section-title-display">Deliverables</h2>
        <ul className="mt-6 grid gap-3 text-sm leading-relaxed ds-text-secondary sm:text-base sm:grid-cols-2">
          {DELIVERABLES.map(item => (
            <li key={item} className="flex items-start gap-2.5">
              <Check size={16} weight="bold" className="mt-1 shrink-0 text-[var(--glc-green-dark)]" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.08}>
        <div className="-mx-4 rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-10 sm:-mx-6 sm:px-6 sm:py-12">
          <MarketingStaggeredReveal className="grid gap-4 md:grid-cols-3 md:items-stretch">
            {OUTCOMES.map((item, i) => {
              const isKeystone = i === 1;
              return (
                <MarketingStaggeredReveal.Item
                  key={item.title}
                  as="article"
                  className={cn(
                    'ds-marketing-outcome-card p-5 sm:p-6',
                    isKeystone && 'ds-marketing-outcome-card--primary',
                  )}
                >
                  <span
                    className={cn(
                      'ds-marketing-card-icon-well',
                      isKeystone && 'ds-marketing-card-icon-well--accent',
                    )}
                    aria-hidden
                  >
                    <item.Icon size={20} weight="bold" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold ds-text-primary sm:text-lg">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed ds-text-secondary">
                    {item.body}
                  </p>
                </MarketingStaggeredReveal.Item>
              );
            })}
          </MarketingStaggeredReveal>
        </div>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.1}>
        <MarketingRevealMask>
          <MarketingComparisonShell padded variant="elevated">
            <ProcessTimeline title="Typical process" steps={TIMELINE} />
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.11}>
        <h2 className="mb-6 ds-marketing-section-title-display">
          Focus vs Context vs Strategy workspace
        </h2>
        <MarketingRevealMask>
          <MarketingComparisonShell variant="elevated">
            <AuditCompare emphasisColumn="strategy" />
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className="ds-marketing-section-gap-loose" delay={0.12}>
        <MarketingMidCtaBand
          landmarkLabel={homePack.landmarks.mid_cta}
          title={mid.title}
          body={mid.body}
          ctaLabel={mid.cta_label}
          ctaTo={mid.cta_to}
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

      <p className="mt-8 text-center text-sm ds-text-tertiary">
        {labels.completeHintPrefix}{' '}
        <Link to="/discovery" className="font-semibold ds-text-brand">
          Discovery
        </Link>
        .
      </p>
    </MarketingLayout>
  );
}
