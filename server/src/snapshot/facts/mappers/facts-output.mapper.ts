import type { SnapshotFacts } from '../../types.js';

type ToSnapshotFactsInput = {
  normalizedBaseUrl: string;
  homepageUrl: string;
  lang: string | null;
  contentQuality: SnapshotFacts['contentQuality'];
  appShellLikely: boolean;
  title: string;
  metaDescription: string;
  ogDescription: string;
  h1: string;
  h1Count: number;
  h2Texts: string[];
  topHeadings: string[];
  navItems: string[];
  ctaTexts: string[];
  topParagraphs: string[];
  bodyTextSample: string;
  schemaTypes: string[];
  phonePresent: boolean;
  emailPresent: boolean;
  addressPresent: boolean;
  openingHoursPresent: boolean;
  slugs: string[];
  internalSample: string[];
  platforms: string[];
  stackByCategory: Record<string, string[]>;
  canonical: string;
  robotsMeta: string;
  hasNoindex: boolean;
  viewportPresent: boolean;
  openGraphTitlePresent: boolean;
  imageTotal: number;
  imageWithAlt: number;
  formPresent: boolean;
  primaryFieldCount: number;
  primaryRequiredCount: number;
  primaryHasLabels: boolean;
  faqLike: boolean;
  testimonialLike: boolean;
  pricingMention: boolean;
  processLike: boolean;
  heroPrimaryCtaCount: number;
  genericMarketingHero: boolean;
  machineReadableSurface: SnapshotFacts['machineReadableSurface'];
  slugsCap: number;
};

export function toSnapshotFacts(input: ToSnapshotFactsInput): SnapshotFacts {
  return {
    site: {
      normalizedUrl: input.normalizedBaseUrl,
      homepageUrl: input.homepageUrl,
    },
    document: { lang: input.lang },
    contentQuality: input.contentQuality,
    appShellLikely: input.appShellLikely,
    siteText: {
      title: input.title,
      metaDescription: input.metaDescription,
      ogDescription: input.ogDescription,
      h1: input.h1,
      h1Count: input.h1Count,
      h2Texts: input.h2Texts,
      topHeadings: input.topHeadings,
      navItems: input.navItems,
      ctaTexts: input.ctaTexts,
      topParagraphs: input.topParagraphs,
      bodyTextSample: input.bodyTextSample,
    },
    schema: { types: input.schemaTypes },
    contact: {
      phonePresent: input.phonePresent,
      emailPresent: input.emailPresent,
      addressPresent: input.addressPresent,
      openingHoursPresent: input.openingHoursPresent,
    },
    urls: {
      slugs: input.slugs.slice(0, input.slugsCap),
      internalSample: [...new Set(input.internalSample)],
    },
    tech: { platforms: input.platforms, stackByCategory: input.stackByCategory },
    meta: {
      canonical: input.canonical,
      robotsMeta: input.robotsMeta,
      hasNoindex: input.hasNoindex,
      viewportPresent: input.viewportPresent,
      openGraphTitlePresent: input.openGraphTitlePresent,
    },
    images: { total: input.imageTotal, withAlt: input.imageWithAlt },
    forms: {
      present: input.formPresent,
      primaryFieldCount: input.primaryFieldCount,
      primaryRequiredCount: input.primaryRequiredCount,
      primaryHasLabels: input.primaryHasLabels,
    },
    blocks: {
      faqLike: input.faqLike,
      testimonialLike: input.testimonialLike,
      pricingMention: input.pricingMention,
      processLike: input.processLike,
    },
    heroPrimaryCtaCount: input.heroPrimaryCtaCount,
    genericMarketingHero: input.genericMarketingHero,
    machineReadableSurface: input.machineReadableSurface,
  };
}
