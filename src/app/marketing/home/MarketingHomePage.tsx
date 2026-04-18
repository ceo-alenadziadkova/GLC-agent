import { useReducedMotion } from 'motion/react';
import { MarketingLayout } from '../MarketingLayout';
import { MarketingSection } from '../blocks/MarketingSection';
import { usePublicBrand } from '../PublicBrandContext';
import { buildMarketingHomeViewModel } from './mappers/home-copy.mapper';
import { HomeFaqPreviewSection } from './sections/HomeFaqPreviewSection';
import { HomeHeroSection } from './sections/HomeHeroSection';
import { HomeHowItWorksSection } from './sections/HomeHowItWorksSection';
import { HomeMetricsSection } from './sections/HomeMetricsSection';
import { HomeMidCtaSection } from './sections/HomeMidCtaSection';
import { HomeOutcomesSection } from './sections/HomeOutcomesSection';
import { HomeTrustSection } from './sections/HomeTrustSection';

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
      <div data-testid="marketing-home" className="flex flex-col gap-16 sm:gap-20 lg:gap-24">
        <MarketingSection
          className="glc-light-home-hero relative -mx-4 align-top overflow-hidden px-4 pb-12 pt-6 sm:-mx-6 sm:px-6 sm:pb-20 sm:pt-10"
          aria-label={viewModel.landmarks.hero}
        >
          <HomeHeroSection reduceMotion={reduceMotion} data={viewModel} />
        </MarketingSection>

        <MarketingSection delay={0.04} aria-label={viewModel.trustMetrics.ariaLabel}>
          <HomeMetricsSection data={viewModel.trustMetrics} />
        </MarketingSection>

        <MarketingSection id="how-it-works" className="scroll-mt-28" delay={0.1} aria-label={viewModel.landmarks.howItWorks}>
          <HomeHowItWorksSection data={viewModel.chooseEntry} />
        </MarketingSection>

        <MarketingSection className="mt-24 sm:mt-28" delay={0.15} aria-label={viewModel.landmarks.outcomes}>
          <HomeOutcomesSection data={viewModel.outcomes} reduceMotion={reduceMotion} />
        </MarketingSection>

        <MarketingSection delay={0.155} aria-label={viewModel.landmarks.trust}>
          <HomeTrustSection data={viewModel.trustStrip} reduceMotion={reduceMotion} />
        </MarketingSection>

        <MarketingSection className="mt-24 sm:mt-28" delay={0.16} aria-label={viewModel.landmarks.faq}>
          <HomeFaqPreviewSection data={viewModel.faq} />
        </MarketingSection>

        <MarketingSection delay={0.18}>
          <HomeMidCtaSection landmarkLabel={viewModel.landmarks.midCta} data={viewModel.midCta} />
        </MarketingSection>
      </div>
    </>
  );
}
