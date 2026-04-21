import { useReducedMotion } from 'motion/react';
import { MarketingLayout } from '../MarketingLayout';
import { MarketingSection } from '../blocks/MarketingSection';
import { usePublicBrand } from '../PublicBrandContext';
import { buildMarketingHomeViewModel } from './mappers/home-copy.mapper';
import { HomeAtAGlanceSection } from './sections/HomeAtAGlanceSection';
import { HomeFaqPreviewSection } from './sections/HomeFaqPreviewSection';
import { HomeHeroSection } from './sections/HomeHeroSection';
import { HomeHowItWorksSection } from './sections/HomeHowItWorksSection';
import { HomeMidCtaSection } from './sections/HomeMidCtaSection';
import { HomeOutcomesSection } from './sections/HomeOutcomesSection';
import { HomeScopeTruthSection } from './sections/HomeScopeTruthSection';

export function MarketingHomePage() {
  return (
    <MarketingLayout>
      <MarketingHomePageContent />
    </MarketingLayout>
  );
}

function MarketingHomePageContent() {
  const reduceMotion = useReducedMotion();
  const { brandName } = usePublicBrand();
  const viewModel = buildMarketingHomeViewModel(brandName);

  return (
    <>
      <div
        data-testid="marketing-home"
        className="flex flex-col gap-16 sm:gap-20 lg:gap-28"
      >
        <MarketingSection
          className="glc-light-home-hero relative -mx-4 align-top overflow-hidden px-4 pb-12 pt-6 sm:-mx-6 sm:px-6 sm:pb-20 sm:pt-10"
          aria-label={viewModel.landmarks.hero}
        >
          <HomeHeroSection reduceMotion={reduceMotion} data={viewModel} />
        </MarketingSection>

        <MarketingSection delay={0.04}>
          <div className="mx-auto w-full max-w-5xl px-5 sm:px-6">
            <p className="border-y border-[var(--border-subtle)] py-6 text-center text-sm font-medium tracking-wide text-[var(--text-secondary)] sm:py-7 sm:text-base">
              {viewModel.hero.pauseLine}
            </p>
          </div>
        </MarketingSection>

        <MarketingSection id="how-it-works" className="scroll-mt-28" delay={0.05} aria-label={viewModel.landmarks.howItWorks}>
          <HomeHowItWorksSection data={viewModel.chooseEntry} />
        </MarketingSection>

        <MarketingSection id="scope-truth" className="sm:mt-3" delay={0.09} aria-label={viewModel.landmarks.scopeTruth}>
          <HomeScopeTruthSection data={viewModel.scopeTruth} />
        </MarketingSection>

        <MarketingSection delay={0.11}>
          <div className="mx-auto w-full max-w-5xl px-5 sm:px-6">
            <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-5 py-4 sm:px-6 sm:py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {viewModel.compressionBridge.kicker}
              </p>
              <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
                {viewModel.compressionBridge.summary}
              </p>
            </div>
          </div>
        </MarketingSection>

        <MarketingSection id="outcomes" className="mt-2 sm:mt-4" delay={0.13} aria-label={viewModel.landmarks.outcomes}>
          <HomeOutcomesSection data={viewModel.outcomes} reduceMotion={reduceMotion} />
        </MarketingSection>

        <MarketingSection className="sm:mt-4" delay={0.15} aria-label={viewModel.atAGlance.ariaLabel}>
          <HomeAtAGlanceSection
            trustMetrics={viewModel.trustMetrics}
            trustStrip={viewModel.trustStrip}
            reduceMotion={reduceMotion}
          />
        </MarketingSection>

        <MarketingSection className="mt-4 sm:mt-6" delay={0.17} aria-label={viewModel.landmarks.faq}>
          <HomeFaqPreviewSection data={viewModel.faq} />
        </MarketingSection>

        <MarketingSection className="mt-6 sm:mt-10 lg:mt-12" delay={0.18}>
          <HomeMidCtaSection landmarkLabel={viewModel.landmarks.midCta} data={viewModel.midCta} />
        </MarketingSection>
      </div>
    </>
  );
}
