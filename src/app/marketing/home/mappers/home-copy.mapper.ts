import marketingHomeCopy from '../../../data/marketing-home-copy.en.json';
import workspacePackaging from '../../../data/marketing-workspace-packaging.en.json';
import type { HomeHeroHeadline, MarketingHomeViewModel } from '../types/home-content.types';

function mapHeroHeadline(headline: string, gradientSuffix: string): HomeHeroHeadline {
  const hasGradientSuffix = headline.endsWith(gradientSuffix) && gradientSuffix.length > 0;
  const plainBefore = hasGradientSuffix
    ? headline.slice(0, headline.length - gradientSuffix.length).trimEnd()
    : headline;

  return {
    full: headline,
    plainBefore,
    gradientSuffix,
    hasGradientSuffix,
  };
}

export function buildMarketingHomeViewModel(brandName: string): MarketingHomeViewModel {
  const pack = workspacePackaging.marketing_home;
  const outcomes = pack.outcomes_section.items;
  const [primary, ...secondary] = outcomes;

  return {
    brandName,
    landmarks: {
      hero: pack.landmarks.hero,
      howItWorks: pack.landmarks.how_it_works,
      outcomes: pack.landmarks.outcomes,
      trust: pack.landmarks.trust,
      faq: pack.landmarks.faq,
      midCta: pack.landmarks.mid_cta,
    },
    hero: {
      eyebrow: pack.hero.eyebrow,
      headline: mapHeroHeadline(pack.hero.headline, pack.hero.headline_gradient_suffix),
      subheadline: pack.hero.subheadline,
      supportingLine: pack.hero.supporting_line || undefined,
      snapshotCaption: pack.hero.snapshot_caption || undefined,
      trustBullets: pack.hero.trust_bullets,
      trustPointsAriaLabel: marketingHomeCopy.trustPointsAriaLabel,
      ctas: {
        primary: pack.hero.ctas.primary,
        secondary: pack.hero.ctas.secondary,
      },
    },
    trustMetrics: {
      ariaLabel: marketingHomeCopy.trustMetricsLandmark,
      tagline: marketingHomeCopy.trustMetricsTagline,
      items: marketingHomeCopy.whoWeAreMetrics,
    },
    chooseEntry: {
      title: marketingHomeCopy.chooseEntryTitle,
      description: marketingHomeCopy.chooseEntryDescription,
    },
    outcomes: {
      title: pack.outcomes_section.title,
      description: pack.outcomes_section.description,
      primary,
      secondary,
    },
    trustStrip: {
      title: pack.trust_strip.title,
      lines: pack.trust_strip.lines,
    },
    faq: {
      title: marketingHomeCopy.questionsTitle,
      description: marketingHomeCopy.questionsDescription,
      items: marketingHomeCopy.faqPreview,
      allQuestionsLabel: marketingHomeCopy.faqAllQuestionsLabel,
    },
    midCta: {
      title: pack.mid_page_cta.title,
      body: pack.mid_page_cta.body,
      ctaLabel: pack.mid_page_cta.cta_label,
      ctaTo: pack.mid_page_cta.cta_to,
    },
  };
}
