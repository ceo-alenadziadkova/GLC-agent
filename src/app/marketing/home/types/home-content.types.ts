export type HomeHeadingVariant = 'bar' | 'rail' | 'minimal';
export type HomeHeadingSize = 'default' | 'display';

export type HomeHeroHeadline = {
  full: string;
  plainBefore: string;
  gradientSuffix: string;
  hasGradientSuffix: boolean;
};

export type HomeOutcomeItem = {
  title: string;
  body: string;
};

export type HomeFaqPreviewItem = {
  q: string;
  a: string;
};

export type HomeMetricItem = {
  value: string;
  label: string;
};

export type MarketingHomeViewModel = {
  brandName: string;
  landmarks: {
    hero: string;
    howItWorks: string;
    outcomes: string;
    trust: string;
    faq: string;
    midCta: string;
  };
  hero: {
    eyebrow: string;
    headline: HomeHeroHeadline;
    subheadline: string;
    supportingLine?: string;
    snapshotCaption?: string;
    trustBullets: string[];
    trustPointsAriaLabel: string;
    ctas: {
      primary: string;
      secondary: string;
    };
  };
  trustMetrics: {
    ariaLabel: string;
    tagline: string;
    items: HomeMetricItem[];
  };
  chooseEntry: {
    title: string;
    description: string;
  };
  outcomes: {
    title: string;
    description: string;
    primary: HomeOutcomeItem;
    secondary: HomeOutcomeItem[];
  };
  trustStrip: {
    title: string;
    lines: string[];
  };
  faq: {
    title: string;
    description: string;
    items: HomeFaqPreviewItem[];
    allQuestionsLabel: string;
  };
  midCta: {
    title: string;
    body: string;
    ctaLabel: string;
    ctaTo: string;
  };
};
