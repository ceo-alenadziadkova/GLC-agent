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

export type HomeOutcomeRoleLens = {
  id: string;
  label: string;
  summary: string;
  specimenBody: string;
  primaryBody: string;
  secondaryBodies: [string, string];
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
    scopeTruth: string;
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
    quickLinksAriaLabel: string;
    quickLinks: Array<{
      label: string;
      to: string;
    }>;
    pauseLine: string;
    ctas: {
      primary: string;
      secondary: string;
    };
  };
  trustMetrics: {
    ariaLabel: string;
    /** Short label above the proof cards (e.g. eyebrow). */
    sectionLabel: string;
    /** Accessible name for proof-point card grid. */
    gridLabel: string;
    tagline: string;
    items: HomeMetricItem[];
  };
  chooseEntry: {
    title: string;
    description: string;
    inputLabel: string;
    resultLabel: string;
    resultTitle: string;
    resultBody: string;
    selectorTitle: string;
    selectorDescription: string;
    selectorOptions: Array<{
      id: string;
      label: string;
      hint: string;
      recommendedPathId: string;
      recommendationLabel: string;
    }>;
    selectorPaths: Array<{
      id: string;
      title: string;
      subtitle: string;
      to: string;
      nextStepLabel: string;
      ctaLabel: string;
    }>;
    selectorComparisonRows: Array<{
      label: string;
      values: {
        snapshot: string;
        pro: string;
        complete: string;
      };
    }>;
    selectorRecoveryLabel: string;
    selectorRecoveryCtaLabel: string;
    selectorRecoveryCtaTo: string;
  };
  /** Editorial “limits as a signal” block — breaks generic SaaS proof ladder. */
  scopeTruth: {
    kicker: string;
    title: string;
    body: string;
    expandTriggerLabel: string;
    expandBody: string;
    coverageItems: string[];
    boundaryNote: string;
    coverageMapHeadingLeft: string;
    coverageMapHeadingRight: string;
    coverageStatusIncludedLabel: string;
  };
  outcomes: {
    title: string;
    description: string;
    specimenEyebrow: string;
    specimenBody: string;
    roleExplorerLabel: string;
    roleLenses: HomeOutcomeRoleLens[];
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
    recoveryLabel?: string;
    recoveryCtaLabel?: string;
    recoveryCtaTo?: string;
  };
  /** Single landmark wrapping trust metrics + trust strip (shorter scroll). */
  atAGlance: {
    ariaLabel: string;
  };
  compressionBridge: {
    kicker: string;
    summary: string;
  };
};
