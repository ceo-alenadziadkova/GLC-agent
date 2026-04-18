import { Link } from 'react-router';
import { Check, X, Target, Compass, MapTrifold, Pulse } from '@phosphor-icons/react';
import { MarketingLayout } from '../marketing/MarketingLayout';
import { MarketingSection } from '../marketing/blocks/MarketingSection';
import { AuditCompare } from '../marketing/blocks/AuditCompare';
import { MarketingComparisonShell } from '../marketing/blocks/MarketingComparisonShell';
import { MarketingMidCtaBand } from '../marketing/blocks/MarketingMidCtaBand';
import { MarketingRevealMask } from '../marketing/blocks/MarketingRevealMask';
import { MarketingStaggeredReveal } from '../marketing/blocks/MarketingStaggeredReveal';
import { PackageMarketingHero } from '../marketing/blocks/PackageMarketingHero';
import { PackageAudienceSection } from '../marketing/blocks/PackageAudienceSection';
import { ProcessTimeline } from '../marketing/blocks/ProcessTimeline';
import { NextStepsCta } from '../marketing/blocks/NextStepsCta';
import { SnapshotTeaser, DiscoveryTeaser } from '../marketing/blocks/RepeatingTeasers';
import { LOGIN_PATH } from '../marketing/marketing-nav';
import workspacePackaging from '../data/marketing-workspace-packaging.en.json';
import { PACKAGE_PAGE_LAYOUT } from '../config/package-page-layout';
import { cn } from '../components/ui/utils';

const L = PACKAGE_PAGE_LAYOUT.focus;

const OUTCOME_ICONS = [Target, Compass, MapTrifold];

export function ExpressAuditPage() {
  const pageCopy = workspacePackaging.package_pages.starter;
  const homePack = workspacePackaging.marketing_home;
  const labels = workspacePackaging.package_page_labels;
  const mid = pageCopy.mid_cta ?? homePack.mid_page_cta;
  const next = pageCopy.next_steps ?? homePack.next_steps;
  const timeline = pageCopy.timeline;
  const scope = pageCopy.scope_comparison;
  const outcomeCards = pageCopy.outcome_cards;
  const outcomeTiming = pageCopy.outcome_timing;
  const signalToDecision = pageCopy.signal_to_decision;
  const processTimelineTitle = pageCopy.process_timeline_title;
  const compareHeading = pageCopy.compare_section_heading;
  const nextHints = pageCopy.next_steps_hints;

  return (
    <MarketingLayout
      breadcrumbs={[
        { label: workspacePackaging.navigation.homeBreadcrumbLabel, to: '/' },
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
          heroTitleScaleClassName={L.heroTitleScaleClass}
        />
      </MarketingSection>

      <MarketingSection delay={0.04}>
        <PackageAudienceSection title={pageCopy.audience.title} cards={pageCopy.audience.cards} />
      </MarketingSection>

      <MarketingSection className={cn('ds-marketing-section-gap-tight', L.sectionGapClass)} delay={0.06}>
        <MarketingRevealMask>
          <MarketingComparisonShell variant="elevated">
            <div className="grid divide-y divide-[var(--border-subtle)] lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <div className="p-6 sm:p-8">
                <h3 className="font-display text-lg font-bold ds-text-primary">
                  {labels.included}
                </h3>
                <ul className="mt-4 space-y-2 text-sm ds-text-secondary">
                  {scope.included.map(line => (
                    <li key={line} className="flex items-start gap-2.5">
                      <Check
                        size={16}
                        weight="bold"
                        className="mt-0.5 shrink-0 text-[var(--glc-green-dark)]"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 sm:p-8">
                <h3 className="font-display text-lg font-bold ds-text-primary">
                  {labels.notIncluded}
                </h3>
                <ul className="mt-4 space-y-2 text-sm ds-text-secondary">
                  {scope.not_included.map(line => (
                    <li key={line} className="flex items-start gap-2.5">
                      <X
                        size={16}
                        weight="bold"
                        className="mt-0.5 shrink-0 ds-text-quaternary"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={cn('ds-marketing-section-gap-tight', L.sectionGapClass)} delay={0.07}>
        <h2 className="ds-marketing-section-title-display">
          {outcomeTiming.title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed ds-text-secondary sm:text-base">
          {outcomeTiming.body}
        </p>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.08}>
        <div className="-mx-4 rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-10 sm:-mx-6 sm:px-6 sm:py-12">
          <MarketingStaggeredReveal className="grid gap-4 md:grid-cols-3">
            {outcomeCards.map((item, i) => {
              const Icon = OUTCOME_ICONS[i] ?? Target;
              const isPrimary = i === 0;
              return (
                <MarketingStaggeredReveal.Item
                  key={item.title}
                  as="article"
                  className={cn(
                    'ds-marketing-outcome-card p-5 sm:p-6',
                    isPrimary && 'ds-marketing-outcome-card--primary',
                  )}
                >
                  <span
                    className={cn(
                      'ds-marketing-card-icon-well',
                      isPrimary && 'ds-marketing-card-icon-well--accent',
                    )}
                    aria-hidden
                  >
                    <Icon size={20} weight="bold" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold ds-text-primary">
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

      <MarketingSection className={L.sectionGapClass} delay={0.09}>
        <h2 className="mb-6 ds-marketing-section-title-display">
          {signalToDecision.title}
        </h2>
        <MarketingRevealMask>
          <MarketingComparisonShell padded variant="elevated">
            <MarketingStaggeredReveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {signalToDecision.items.map(({ label, detail }) => (
                <MarketingStaggeredReveal.Item
                  key={label}
                  className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-surface)_92%,var(--bg-muted))] p-4 text-center"
                >
                  <span
                    className="ds-marketing-card-icon-well ds-marketing-card-icon-well--small mb-3"
                    aria-hidden
                  >
                    <Pulse size={16} weight="bold" aria-hidden />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-wide ds-text-glc-blue-light">
                    {label}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed ds-text-secondary">
                    {detail}
                  </p>
                </MarketingStaggeredReveal.Item>
              ))}
            </MarketingStaggeredReveal>
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.1}>
        <MarketingRevealMask>
          <MarketingComparisonShell padded variant="elevated">
            <ProcessTimeline title={processTimelineTitle} steps={timeline} />
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.11}>
        <h2 className="mb-6 ds-marketing-section-title-display">
          {compareHeading}
        </h2>
        <MarketingRevealMask>
          <MarketingComparisonShell variant="elevated">
            <AuditCompare focusedPackage="starter" />
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
            { to: '/faq', label: labels.faqLabel, hint: nextHints.faq },
            { to: '/brief', label: labels.bookBriefLabel, hint: labels.bookBriefHintStarter, primary: true },
            { to: LOGIN_PATH, label: labels.clientSignInLabel, hint: nextHints.client_sign_in },
          ]}
        />
      </div>

      <p className="mt-8 text-center text-sm ds-text-secondary">
        {labels.stillUnsurePrefix}{' '}
        <Link to="/snapshot" className="text-info font-semibold">
          {workspacePackaging.navigation.links.snapshot}
        </Link>
        .
      </p>
    </MarketingLayout>
  );
}
