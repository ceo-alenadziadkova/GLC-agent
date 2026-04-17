import * as cheerio from 'cheerio';
import { SYSTEM_DEFAULTS } from '../../../config/system-defaults.js';
import {
  detectTechStackRecord,
  extractJsonLdTypes,
  listDetectedTechPlatforms,
} from '../../../lib/site-html-signals.js';
import type { FetchedPage, SnapshotFacts } from '../../types.js';
import { FACT_EXTRACTION_POLICY } from '../config/fact-extraction-policy.js';
import { FACT_EXTRACTION_REGEX } from '../config/fact-patterns.js';
import { contentQualityAndShell } from '../domain/content-quality.js';
import { extractHomepageElements } from '../domain/homepage-elements.js';
import { detectMachineReadableSurface } from '../domain/machine-readable-surface.js';
import { extractPageSignals } from '../domain/page-signals.js';
import {
  collectLinkPathSegments,
  collectTitleWordSlugs,
  mergeUnique,
  normSlug,
} from '../domain/slug-signals.js';
import { toSnapshotFacts } from '../mappers/facts-output.mapper.js';

export type ExtractFactsOptions = {
  /** When the canonical homepage was not fetched (e.g. robots.txt), keep `site.homepageUrl` on the submitted URL. */
  canonicalHomepageUrl?: string;
};

/**
 * Merge multiple pages: homepage (first) drives hero/H1/primary form; others add slugs, signals, schema types.
 */
export function extractFacts(
  pages: FetchedPage[],
  normalizedBaseUrl: string,
  opts: ExtractFactsOptions | undefined,
  buildEmptyFacts: (baseUrl: string) => SnapshotFacts,
): SnapshotFacts {
  if (pages.length === 0) {
    return buildEmptyFacts(normalizedBaseUrl);
  }

  const home = pages[0]!;
  const { $: $h, data: homeData } = extractHomepageElements(home);
  const { contentQuality, appShellLikely, bodyTextSample } = contentQualityAndShell(home.html, $h);
  const homeSignals = extractPageSignals($h);

  let allSlugs = normSlug(new URL(home.finalUrl).pathname);
  let schemaTypes = extractJsonLdTypes(home.html);
  let faqLike = homeSignals.faqLike;
  let testimonialLike = homeSignals.testimonialLike;
  let pricingMention = homeSignals.pricingMention;
  let processLike = homeSignals.processLike;
  let ctaTexts = [...homeSignals.ctaTexts];
  let navItems = [...homeSignals.navItems];

  const combinedHtml = pages.map(p => p.html).join('\n');
  const pageUrls = pages.map(p => p.finalUrl);
  const stackByCategory = detectTechStackRecord(combinedHtml, { pageUrls });
  const platforms = listDetectedTechPlatforms(combinedHtml, { pageUrls });

  for (let i = 1; i < pages.length; i++) {
    const page = pages[i]!;
    const $p = cheerio.load(page.html);
    const url = new URL(page.finalUrl);
    allSlugs = mergeUnique(allSlugs, normSlug(url.pathname));
    schemaTypes = mergeUnique(schemaTypes, extractJsonLdTypes(page.html));
    const nextSignals = extractPageSignals($p);
    faqLike = faqLike || nextSignals.faqLike;
    testimonialLike = testimonialLike || nextSignals.testimonialLike;
    pricingMention = pricingMention || nextSignals.pricingMention;
    processLike = processLike || nextSignals.processLike;
    ctaTexts = mergeUnique(ctaTexts, nextSignals.ctaTexts);
    navItems = mergeUnique(navItems, nextSignals.navItems);
  }

  const slugCap = Math.min(
    SYSTEM_DEFAULTS.snapshotLinkSlug.max,
    SYSTEM_DEFAULTS.snapshotLinkSlug.hardCap,
  );
  allSlugs = mergeUnique(allSlugs, collectLinkPathSegments(pages, slugCap));
  allSlugs = mergeUnique(allSlugs, collectTitleWordSlugs(pages, slugCap));

  const homepageUrlForFacts =
    typeof opts?.canonicalHomepageUrl === 'string' && opts.canonicalHomepageUrl.trim().length > 0
      ? opts.canonicalHomepageUrl.trim()
      : home.finalUrl;

  return toSnapshotFacts({
    normalizedBaseUrl,
    homepageUrl: homepageUrlForFacts,
    lang: homeData.lang,
    contentQuality,
    appShellLikely,
    title: homeData.title,
    metaDescription: homeData.metaDescription,
    ogDescription: homeData.ogDescription,
    h1: homeData.h1,
    h1Count: homeData.h1Count,
    h2Texts: homeData.h2Texts,
    topHeadings: homeData.topHeadings,
    navItems: navItems.slice(0, FACT_EXTRACTION_POLICY.limits.navItemsMax),
    ctaTexts: ctaTexts.slice(0, FACT_EXTRACTION_POLICY.limits.ctaTextsMax),
    topParagraphs: homeData.topParagraphs,
    bodyTextSample,
    schemaTypes,
    phonePresent: homeData.phonePresent,
    emailPresent: homeData.emailPresent,
    addressPresent: homeData.addressPresent,
    openingHoursPresent: homeData.openingHoursPresent,
    slugs: allSlugs,
    internalSample: homeData.internalSample.slice(0, FACT_EXTRACTION_POLICY.limits.internalSampleMax),
    platforms,
    stackByCategory,
    canonical: homeData.canonical,
    robotsMeta: homeData.robotsMeta,
    hasNoindex: homeData.hasNoindex,
    viewportPresent: homeData.viewportPresent,
    openGraphTitlePresent: homeData.openGraphTitlePresent,
    imageTotal: homeData.imageTotal,
    imageWithAlt: homeData.imageWithAlt,
    formPresent: homeData.formPresent,
    primaryFieldCount: homeData.primaryFieldCount,
    primaryRequiredCount: homeData.primaryRequiredCount,
    primaryHasLabels: homeData.primaryHasLabels,
    faqLike,
    testimonialLike,
    pricingMention,
    processLike,
    heroPrimaryCtaCount: homeData.heroPrimaryCtaCount,
    genericMarketingHero:
      FACT_EXTRACTION_REGEX.genericMarketing.test(homeData.h1) ||
      FACT_EXTRACTION_REGEX.genericMarketing.test(homeData.title),
    machineReadableSurface: detectMachineReadableSurface(pages),
    slugsCap: slugCap,
  });
}
