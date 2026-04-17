import type { SnapshotFacts } from '../../types.js';

export function buildEmptyFacts(normalizedBaseUrl: string): SnapshotFacts {
  return {
    site: { normalizedUrl: normalizedBaseUrl, homepageUrl: normalizedBaseUrl },
    document: { lang: null },
    contentQuality: 'low',
    appShellLikely: true,
    siteText: {
      title: '',
      metaDescription: '',
      ogDescription: '',
      h1: '',
      h1Count: 0,
      h2Texts: [],
      topHeadings: [],
      navItems: [],
      ctaTexts: [],
      topParagraphs: [],
      bodyTextSample: '',
    },
    schema: { types: [] },
    contact: {
      phonePresent: false,
      emailPresent: false,
      addressPresent: false,
      openingHoursPresent: false,
    },
    urls: { slugs: [], internalSample: [] },
    tech: { platforms: [], stackByCategory: {} },
    meta: { canonical: '', robotsMeta: '', hasNoindex: false, viewportPresent: false, openGraphTitlePresent: false },
    images: { total: 0, withAlt: 0 },
    forms: { present: false, primaryFieldCount: 0, primaryRequiredCount: 0, primaryHasLabels: false },
    blocks: {
      faqLike: false,
      testimonialLike: false,
      pricingMention: false,
      processLike: false,
    },
    heroPrimaryCtaCount: 0,
    genericMarketingHero: false,
    machineReadableSurface: { sitemapLinkInHtml: false, llmsOrAiTxtLinked: false },
  };
}
