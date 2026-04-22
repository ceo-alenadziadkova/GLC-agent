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
import { PACKAGE_PAGE_LAYOUT } from '../config/package-page-layout';
import { cn } from '../components/ui/utils';
import { ORCHESTRATION_UI_COPY } from '../config/orchestration-roadmap-ui-copy.en';

const L = PACKAGE_PAGE_LAYOUT.focus;

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
                <h3 className="text-foreground font-display text-lg font-bold">
                  {labels.included}
                </h3>
                <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-sm">
                  {scope.included.map(line => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="p-6 sm:p-8">
                <h3 className="text-foreground font-display text-lg font-bold">
                  {labels.notIncluded}
                </h3>
                <ul className="text-muted-foreground mt-3 list-disc space-y-2 pl-5 text-sm">
                  {scope.not_included.map(line => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.07}>
        <h2 className="text-foreground font-display text-xl font-bold sm:text-2xl">
          {outcomeTiming.title}
        </h2>
        <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-relaxed">
          {outcomeTiming.body}
        </p>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.08}>
        <div className="rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--bg-muted)] px-4 py-8 sm:px-6 sm:py-10">
          <div className="grid gap-4 md:grid-cols-3">
            {outcomeCards.map(item => (
              <article
                key={item.title}
                className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-surface)_88%,var(--bg-muted))] p-5 sm:p-6"
              >
                <h3 className="text-foreground font-display text-base font-bold">
                  {item.title}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.09}>
        <h2 className="text-foreground mb-6 font-display text-xl font-bold sm:text-2xl">
          {signalToDecision.title}
        </h2>
        <MarketingRevealMask>
          <MarketingComparisonShell padded>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {signalToDecision.items.map(({ label, detail }) => (
                <div
                  key={label}
                  className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[color-mix(in_oklab,var(--bg-surface)_88%,var(--bg-muted))] p-4 text-center"
                >
                  <p className="text-info text-xs font-bold uppercase tracking-wide">
                    {label}
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    {detail}
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
            <ProcessTimeline title={processTimelineTitle} steps={timeline} />
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.11}>
        <h2 className="text-foreground mb-6 font-display text-xl font-bold sm:text-2xl">
          {compareHeading}
        </h2>
        <MarketingRevealMask>
          <MarketingComparisonShell>
            <AuditCompare focusedPackage="starter" />
          </MarketingComparisonShell>
        </MarketingRevealMask>
      </MarketingSection>

      <MarketingSection className={L.sectionGapClass} delay={0.115}>
        <MarketingComparisonShell padded>
          <h2 className="text-foreground font-display text-xl font-bold sm:text-2xl">{ORCHESTRATION_UI_COPY.marketingTeaserTitle}</h2>
          <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-relaxed">{ORCHESTRATION_UI_COPY.marketingTeaserBody}</p>
        </MarketingComparisonShell>
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
            { to: '/faq', label: labels.faqLabel, hint: nextHints.faq },
            { to: '/brief', label: labels.bookBriefLabel, hint: labels.bookBriefHintStarter, primary: true },
            { to: LOGIN_PATH, label: labels.clientSignInLabel, hint: nextHints.client_sign_in },
          ]}
        />
      </div>

      <p className="text-muted-foreground mt-8 text-center text-sm">
        {labels.stillUnsurePrefix}{' '}
        <Link to="/snapshot" className="text-info font-semibold">
          {workspacePackaging.navigation.links.snapshot}
        </Link>
        .
      </p>
    </MarketingLayout>
  );
}
