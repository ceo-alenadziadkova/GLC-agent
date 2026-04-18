import { Link } from 'react-router';
import { Check, X, Compass, Target, ChartLineUp, MapTrifold } from '@phosphor-icons/react';
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
import { SnapshotTeaser, BriefTeaser } from '../marketing/blocks/RepeatingTeasers';
import { LOGIN_PATH } from '../marketing/marketing-nav';
import workspacePackaging from '../data/marketing-workspace-packaging.en.json';
import { PACKAGE_PAGE_LAYOUT } from '../config/package-page-layout';
import { cn } from '../components/ui/utils';

const L = PACKAGE_PAGE_LAYOUT.context;

const OUTCOME_ICONS = [Compass, Target, ChartLineUp, MapTrifold];

export function ProAuditPage() {
  const pageCopy = workspacePackaging.package_pages.pro;
  const { quick, strategy } = workspacePackaging.packages;
  const homePack = workspacePackaging.marketing_home;
  const labels = workspacePackaging.package_page_labels;
  const mid = pageCopy.mid_cta ?? homePack.mid_page_cta;
  const next = pageCopy.next_steps ?? homePack.next_steps;
  const timeline = pageCopy.timeline;
  const scope = pageCopy.scope_comparison;
  const outcomeCards = pageCopy.outcome_cards;
  const processTimelineTitle = pageCopy.process_timeline_title;
  const compareHeading = pageCopy.compare_section_heading;
  const nextHints = pageCopy.next_steps_hints;

  const [primaryOutcome, ...supportingOutcomes] = outcomeCards;

  return (
    <MarketingLayout
      breadcrumbs={[
        { label: workspacePackaging.navigation.homeBreadcrumbLabel, to: '/' },
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
                      <X size={16} weight="bold" className="mt-0.5 shrink-0 ds-text-quaternary" aria-hidden />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.08}>
        <div className="-mx-4 rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-10 sm:-mx-6 sm:px-6 sm:py-12">
          <MarketingStaggeredReveal className="grid gap-4 lg:grid-cols-12 lg:gap-5">
            {primaryOutcome ? (
              <MarketingStaggeredReveal.Item
                as="article"
                className="ds-marketing-outcome-card ds-marketing-outcome-card--primary p-6 sm:p-7 lg:col-span-7"
              >
                <span className="ds-marketing-card-icon-well ds-marketing-card-icon-well--accent" aria-hidden>
                  <Compass size={22} weight="bold" aria-hidden />
                </span>
                <h3 className="mt-5 font-display text-lg font-bold ds-text-primary sm:text-xl">
                  {primaryOutcome.title}
                </h3>
                <p className="mt-3 max-w-[52ch] text-sm leading-relaxed ds-text-secondary sm:text-base">
                  {primaryOutcome.body}
                </p>
              </MarketingStaggeredReveal.Item>
            ) : null}
            <div className="flex flex-col gap-4 lg:col-span-5">
              {supportingOutcomes.map((item, i) => {
                const Icon = OUTCOME_ICONS[i + 1] ?? Target;
                return (
                  <MarketingStaggeredReveal.Item
                    key={item.title}
                    as="article"
                    className="ds-marketing-outcome-card flex-1 p-5 sm:p-6"
                  >
                    <span className="ds-marketing-card-icon-well ds-marketing-card-icon-well--small" aria-hidden>
                      <Icon size={18} weight="bold" aria-hidden />
                    </span>
                    <h3 className="mt-3 font-display text-base font-bold ds-text-primary">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed ds-text-secondary">
                      {item.body}
                    </p>
                  </MarketingStaggeredReveal.Item>
                );
              })}
            </div>
          </MarketingStaggeredReveal>
        </div>
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
            <AuditCompare focusedPackage="pro" />
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
          layout="rail"
          steps={[
            { to: '/starter', label: quick.title, hint: quick.subtitle },
            { to: '/complete', label: strategy.title, hint: strategy.subtitle },
            { to: '/brief', label: labels.bookBriefLabel, hint: labels.bookBriefHintPro, primary: true },
            { to: '/faq', label: labels.faqLabel, hint: nextHints.faq },
            { to: LOGIN_PATH, label: labels.clientSignInLabel, hint: nextHints.client_sign_in },
          ]}
        />
      </div>

      <p className="mt-8 text-center text-sm ds-text-tertiary">
        {labels.proHintPrefix}{' '}
        <Link to="/brief" className="font-semibold ds-text-brand">
          {workspacePackaging.navigation.links.brief}
        </Link>
        .
      </p>
    </MarketingLayout>
  );
}
