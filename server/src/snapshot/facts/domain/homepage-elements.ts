import * as cheerio from 'cheerio';
import type { FetchedPage } from '../../types.js';
import { FACT_EXTRACTION_POLICY } from '../config/fact-extraction-policy.js';
import { FACT_EXTRACTION_REGEX } from '../config/fact-patterns.js';
import { extractAddressish, extractOpeningHours } from './contact-signals.js';

export type HomepageElements = {
  lang: string | null;
  title: string;
  metaDescription: string;
  ogDescription: string;
  h1Count: number;
  h1: string;
  h2Texts: string[];
  topHeadings: string[];
  topParagraphs: string[];
  canonical: string;
  robotsMeta: string;
  hasNoindex: boolean;
  viewportPresent: boolean;
  openGraphTitlePresent: boolean;
  phonePresent: boolean;
  emailPresent: boolean;
  addressPresent: boolean;
  openingHoursPresent: boolean;
  formPresent: boolean;
  primaryFieldCount: number;
  primaryRequiredCount: number;
  primaryHasLabels: boolean;
  imageTotal: number;
  imageWithAlt: number;
  internalSample: string[];
  heroPrimaryCtaCount: number;
};

export function extractHomepageElements(home: FetchedPage): { $: cheerio.CheerioAPI; data: HomepageElements } {
  const $h = cheerio.load(home.html);
  const lang =
    $h('html').attr('lang')?.trim().slice(0, FACT_EXTRACTION_POLICY.limits.titleLangSliceMax) ||
    $h('meta[http-equiv="content-language"]')
      .attr('content')
      ?.trim()
      .slice(0, FACT_EXTRACTION_POLICY.limits.titleLangSliceMax) ||
    null;

  const title = $h('title').first().text().trim();
  const metaDescription = $h('meta[name="description"]').attr('content')?.trim() || '';
  const ogDescription = $h('meta[property="og:description"]').attr('content')?.trim() || '';

  const h1Els = $h('h1');
  const h1Count = h1Els.length;
  const h1 = $h('main h1').first().text().trim() || h1Els.first().text().trim();
  const h2Texts = $h('h2')
    .map((_, el) => $h(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, FACT_EXTRACTION_POLICY.limits.h2Max);
  const topHeadings = [...$h('h1, h2, h3')]
    .slice(0, FACT_EXTRACTION_POLICY.limits.topHeadingsMax)
    .map(el => $h(el).text().trim())
    .filter(Boolean);

  const topParagraphs = $h('main p, article p, body p')
    .map((_, el) => $h(el).text().trim())
    .get()
    .filter(t => t.length > FACT_EXTRACTION_POLICY.limits.paragraphMinLen)
    .slice(0, FACT_EXTRACTION_POLICY.limits.topParagraphsMax);

  const canonical = $h('link[rel="canonical"]').attr('href')?.trim() || '';
  const robotsMeta =
    $h('meta[name="robots"]').attr('content')?.trim() ||
    $h('meta[name="googlebot"]').attr('content')?.trim() ||
    '';
  const hasNoindex = FACT_EXTRACTION_REGEX.noindex.test(robotsMeta);
  const viewportContent = $h('meta[name="viewport"]').attr('content')?.trim() ?? '';
  const viewportPresent =
    viewportContent.length > 0 && FACT_EXTRACTION_REGEX.viewportWidth.test(viewportContent);
  const ogTitle = $h('meta[property="og:title"]').attr('content')?.trim() ?? '';
  const openGraphTitlePresent = ogTitle.length > 0;

  const phonePresent = $h('a[href^="tel:"]').length > 0 || FACT_EXTRACTION_REGEX.phoneInHtml.test(home.html);
  const emailPresent = $h('a[href^="mailto:"]').length > 0;
  const addressPresent = extractAddressish($h);
  const openingHoursPresent = extractOpeningHours($h);

  const forms = $h('form');
  const primaryForm = forms.first();
  const primaryFieldCount = primaryForm.length
    ? primaryForm.find('input, select, textarea').not('[type="hidden"]').length
    : 0;
  const primaryRequiredCount = primaryForm.length ? primaryForm.find('[required]').length : 0;
  const primaryHasLabels = primaryForm.length ? primaryForm.find('label').length > 0 : false;

  const images = $h('img');
  const imageTotal = images.length;
  let imageWithAlt = 0;
  images.each((_, img) => {
    if ($h(img).attr('alt')?.trim()) imageWithAlt++;
  });

  const internalSample: string[] = [];
  const base = new URL(home.finalUrl);
  $h('a[href]').each((_, a) => {
    const href = $h(a).attr('href');
    if (!href || internalSample.length >= FACT_EXTRACTION_POLICY.limits.internalSampleMax) return;
    try {
      const u = new URL(href, home.finalUrl);
      if (u.hostname === base.hostname) internalSample.push(u.href);
    } catch {
      /* skip invalid href */
    }
  });

  const heroSlice = $h('main, body').first().html() || '';
  const hero$ = cheerio.load(`<wrap>${heroSlice.slice(0, FACT_EXTRACTION_POLICY.hero.htmlSliceMax)}</wrap>`);
  let heroPrimaryCtaCount = 0;
  hero$('a, button').each((_, el) => {
    const t = hero$(el).text().trim();
    if (t && FACT_EXTRACTION_REGEX.ctaVerb.test(t)) heroPrimaryCtaCount++;
  });

  return {
    $: $h,
    data: {
      lang,
      title,
      metaDescription,
      ogDescription,
      h1Count,
      h1,
      h2Texts,
      topHeadings,
      topParagraphs,
      canonical,
      robotsMeta,
      hasNoindex,
      viewportPresent,
      openGraphTitlePresent,
      phonePresent,
      emailPresent,
      addressPresent,
      openingHoursPresent,
      formPresent: forms.length > 0,
      primaryFieldCount,
      primaryRequiredCount,
      primaryHasLabels,
      imageTotal,
      imageWithAlt,
      internalSample,
      heroPrimaryCtaCount,
    },
  };
}
