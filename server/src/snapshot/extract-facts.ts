/**
 * Build SnapshotFacts from fetched HTML pages (homepage-first merge).
 */
import * as cheerio from 'cheerio';
import {
  detectTechStackRecord,
  extractJsonLdTypes,
  listDetectedTechPlatforms,
} from '../lib/site-html-signals.js';
import type { FetchedPage, SnapshotFacts } from './types.js';

const CTA_VERB_RE =
  /(book|start|get|request|contact|schedule|demo|try|call|quote|buy|add to cart|checkout|subscribe|sign up|free trial)/i;

const GENERIC_MARKETING_RE =
  /\b(growth|excellence|trusted partner|innovation|empower|transform|solutions?\s+for\s+everyone)\b/i;

/** Max distinct path segments collected from same-origin links (all fetched pages). */
const MAX_URL_SLUGS = 80;

function normSlug(pathname: string): string[] {
  return pathname
    .split('/')
    .map(s => s.replace(/\.[a-z0-9]+$/i, '').toLowerCase())
    .filter(Boolean);
}

function mergeUnique<T>(a: T[], b: T[]): T[] {
  return [...new Set([...a, ...b])];
}

/** Sitemap / AI discovery file signals in sampled HTML (not a live sitemap fetch). */
function detectMachineReadableSurface(pages: FetchedPage[]): {
  sitemapLinkInHtml: boolean;
  llmsOrAiTxtLinked: boolean;
} {
  let sitemapLinkInHtml = false;
  let llmsOrAiTxtLinked = false;
  for (const p of pages) {
    const $ = cheerio.load(p.html);
    if ($('link[rel="sitemap"]').length > 0) sitemapLinkInHtml = true;
    $('a[href], link[href]').each((_, el) => {
      const href = ($(el).attr('href') ?? '').trim();
      if (!href) return;
      const lower = href.toLowerCase();
      if (lower.includes('llms.txt') || /\b\/ai\.txt\b|\bai\.txt\b/i.test(href)) {
        llmsOrAiTxtLinked = true;
      }
      if (/sitemap[^"'?\s]*\.(xml|txt)(\?|$)/i.test(href) || /sitemap[_-]?(index|_index)?\.xml/i.test(lower)) {
        sitemapLinkInHtml = true;
      }
    });
    if (/rel=["']sitemap["']/i.test(p.html)) sitemapLinkInHtml = true;
    if (/href=["'][^"']*llms\.txt/i.test(p.html)) llmsOrAiTxtLinked = true;
    if (/href=["'][^"']*\/ai\.txt/i.test(p.html)) llmsOrAiTxtLinked = true;
  }
  return { sitemapLinkInHtml, llmsOrAiTxtLinked };
}

/** Path segments from internal links (nav/footer/body) — improves classification when only homepage HTML is loaded. */
function collectLinkPathSegments(pages: FetchedPage[], segmentLimit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  outer: for (const page of pages) {
    const $ = cheerio.load(page.html);
    let base: URL;
    try {
      base = new URL(page.finalUrl);
    } catch {
      continue;
    }
    const anchors = $('a[href]').toArray();
    for (const el of anchors) {
      if (out.length >= segmentLimit) break outer;
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
      try {
        const u = new URL(href, page.finalUrl);
        if (u.hostname !== base.hostname) continue;
        for (const seg of normSlug(u.pathname)) {
          if (!seg || seen.has(seg)) continue;
          seen.add(seg);
          out.push(seg);
          if (out.length >= segmentLimit) break outer;
        }
      } catch {
        /* skip invalid href */
      }
    }
  }
  return out;
}

function extractOpeningHours($: cheerio.CheerioAPI): boolean {
  const text = $.root().text().toLowerCase();
  return (
    $('[itemtype*="OpeningHours"]').length > 0 ||
    /opening hours|open\s+now|monday|tuesday|wednesday|hours:/i.test(text)
  );
}

function extractAddressish($: cheerio.CheerioAPI): boolean {
  return (
    $('[itemtype*="PostalAddress"]').length > 0 ||
    /street|avenue|boulevard|postal code|zip code|\b\d{5}\b/.test($.root().text())
  );
}

function pageSignals($: cheerio.CheerioAPI): {
  faqLike: boolean;
  testimonialLike: boolean;
  pricingMention: boolean;
  processLike: boolean;
  ctaTexts: string[];
  navItems: string[];
} {
  const faqLike =
    $("[id*='faq' i], [class*='faq' i], [data-section*='faq' i]").length > 0 ||
    $('details').length >= 2;
  const testimonialLike =
    $("[class*='testimonial' i], [id*='testimonial' i], blockquote").length > 0;
  const body = $.root().text().toLowerCase();
  const pricingMention = /\$|€|£|pricing|plans?|per month|\/mo\b/.test(body);
  const processLike =
    $("[class*='process' i], [class*='how it works' i], [id*='steps' i]").length > 0 ||
    /how it works|our process|step\s*1/i.test(body);

  const ctaTexts: string[] = [];
  $('a, button').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 1 && t.length < 120 && CTA_VERB_RE.test(t)) {
      ctaTexts.push(t);
    }
  });

  const navItems: string[] = [];
  $('header nav a, nav a, [role="navigation"] a').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 0 && t.length < 80) navItems.push(t);
  });

  return { faqLike, testimonialLike, pricingMention, processLike, ctaTexts, navItems };
}

/**
 * True when the raw HTML is probably an empty JS shell — tier-3 Playwright may recover real content.
 * Mirrors app-shell heuristics used for contentQuality (keep in sync).
 */
export function htmlLooksLikeClientShell(html: string): boolean {
  const $ = cheerio.load(html);
  const main = $('main').text() || $('article').text() || $('body').text();
  const trimmed = main.replace(/\s+/g, ' ').trim();
  const len = trimmed.length;
  const scripts = $('script').length;
  return (
    (len < 400 && scripts > 15) || /id=["']root["']|id=["']__next["']|data-reactroot/i.test(html)
  );
}

function contentQualityAndShell(html: string, $: cheerio.CheerioAPI): {
  contentQuality: SnapshotFacts['contentQuality'];
  appShellLikely: boolean;
  bodyTextSample: string;
} {
  const main = $('main').text() || $('article').text() || $('body').text();
  const trimmed = main.replace(/\s+/g, ' ').trim();
  const len = trimmed.length;

  const appShellLikely = htmlLooksLikeClientShell(html);

  let contentQuality: SnapshotFacts['contentQuality'] = 'high';
  if (len < 200 || appShellLikely) contentQuality = 'low';
  else if (len < 900) contentQuality = 'medium';

  return {
    contentQuality,
    appShellLikely,
    bodyTextSample: trimmed.slice(0, 2500),
  };
}

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
  opts?: ExtractFactsOptions,
): SnapshotFacts {
  if (pages.length === 0) {
    return buildEmptyFacts(normalizedBaseUrl);
  }

  const home = pages[0]!;
  const $h = cheerio.load(home.html);
  const homeUrl = home.finalUrl;

  const lang =
    $h('html').attr('lang')?.trim().slice(0, 5) ||
    $h('meta[http-equiv="content-language"]').attr('content')?.trim().slice(0, 5) ||
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
    .slice(0, 12);
  const topHeadings = [...$h('h1, h2, h3')]
    .slice(0, 15)
    .map(el => $h(el).text().trim())
    .filter(Boolean);

  const ps = $h('main p, article p, body p')
    .map((_, el) => $h(el).text().trim())
    .get()
    .filter(t => t.length > 40)
    .slice(0, 5);

  const { contentQuality, appShellLikely, bodyTextSample } = contentQualityAndShell(home.html, $h);
  const sig = pageSignals($h);

  let allSlugs: string[] = [];
  let schemaTypes = extractJsonLdTypes(home.html);
  let canonical = $h('link[rel="canonical"]').attr('href')?.trim() || '';
  const robotsMeta =
    $h('meta[name="robots"]').attr('content')?.trim() ||
    $h('meta[name="googlebot"]').attr('content')?.trim() ||
    '';
  const hasNoindex = /noindex/i.test(robotsMeta);
  const viewportContent = $h('meta[name="viewport"]').attr('content')?.trim() ?? '';
  const viewportPresent = viewportContent.length > 0 && /width/i.test(viewportContent);
  const ogTitle = $h('meta[property="og:title"]').attr('content')?.trim() ?? '';
  const openGraphTitlePresent = ogTitle.length > 0;

  const phones =
    $h('a[href^="tel:"]').length > 0 || /\+\d[\d\s().-]{8,}/.test(home.html);
  const emails = $h('a[href^="mailto:"]').length > 0;
  const addressPresent = extractAddressish($h);
  const openingHoursPresent = extractOpeningHours($h);

  const forms = $h('form');
  const primaryForm = forms.first();
  const fieldCount = primaryForm.length
    ? primaryForm.find('input, select, textarea').not('[type="hidden"]').length
    : 0;
  const requiredCount = primaryForm.length ? primaryForm.find('[required]').length : 0;
  const hasLabels = primaryForm.length ? primaryForm.find('label').length > 0 : false;

  const images = $h('img');
  const totalImg = images.length;
  let withAlt = 0;
  images.each((_, img) => {
    if ($h(img).attr('alt')?.trim()) withAlt++;
  });

  const internalSample: string[] = [];
  const base = new URL(homeUrl);
  $h('a[href]').each((_, a) => {
    const href = $h(a).attr('href');
    if (!href || internalSample.length >= 40) return;
    try {
      const u = new URL(href, homeUrl);
      if (u.hostname === base.hostname) internalSample.push(u.href);
    } catch {
      /* skip */
    }
  });

  allSlugs = mergeUnique(allSlugs, normSlug(base.pathname));

  let faqLike = sig.faqLike;
  let testimonialLike = sig.testimonialLike;
  let pricingMention = sig.pricingMention;
  let processLike = sig.processLike;
  let ctaTexts = [...sig.ctaTexts];
  let navItems = [...sig.navItems];

  const combinedHtml = pages.map(p => p.html).join('\n');
  const pageUrls = pages.map(p => p.finalUrl);
  const stackByCategory = detectTechStackRecord(combinedHtml, { pageUrls });
  const platforms = listDetectedTechPlatforms(combinedHtml, { pageUrls });

  for (let i = 1; i < pages.length; i++) {
    const $p = cheerio.load(pages[i]!.html);
    const u = new URL(pages[i]!.finalUrl);
    allSlugs = mergeUnique(allSlugs, normSlug(u.pathname));
    schemaTypes = mergeUnique(schemaTypes, extractJsonLdTypes(pages[i]!.html));
    const s2 = pageSignals($p);
    faqLike = faqLike || s2.faqLike;
    testimonialLike = testimonialLike || s2.testimonialLike;
    pricingMention = pricingMention || s2.pricingMention;
    processLike = processLike || s2.processLike;
    ctaTexts = mergeUnique(ctaTexts, s2.ctaTexts);
    navItems = mergeUnique(navItems, s2.navItems);
  }

  const linkSegLimit = Number(process.env.SNAPSHOT_LINK_SLUG_LIMIT ?? MAX_URL_SLUGS);
  const cap = Number.isFinite(linkSegLimit) && linkSegLimit > 0 ? Math.min(linkSegLimit, 200) : MAX_URL_SLUGS;
  allSlugs = mergeUnique(allSlugs, collectLinkPathSegments(pages, cap));

  const heroSlice = $h('main, body').first().html() || '';
  const hero$ = cheerio.load(`<wrap>${heroSlice.slice(0, 12000)}</wrap>`);
  let primaryCtasAboveFold = 0;
  hero$('a, button').each((_, el) => {
    const t = hero$(el).text().trim();
    if (t && CTA_VERB_RE.test(t)) primaryCtasAboveFold++;
  });

  const machineReadableSurface = detectMachineReadableSurface(pages);

  const homepageUrlForFacts =
    typeof opts?.canonicalHomepageUrl === 'string' && opts.canonicalHomepageUrl.trim().length > 0
      ? opts.canonicalHomepageUrl.trim()
      : homeUrl;

  return {
    site: {
      normalizedUrl: normalizedBaseUrl,
      homepageUrl: homepageUrlForFacts,
    },
    document: { lang },
    contentQuality,
    appShellLikely,
    siteText: {
      title,
      metaDescription,
      ogDescription,
      h1,
      h1Count,
      h2Texts,
      topHeadings,
      navItems: navItems.slice(0, 40),
      ctaTexts: ctaTexts.slice(0, 30),
      topParagraphs: ps,
      bodyTextSample,
    },
    schema: { types: schemaTypes },
    contact: {
      phonePresent: phones,
      emailPresent: emails,
      addressPresent,
      openingHoursPresent,
    },
    urls: {
      slugs: allSlugs.slice(0, cap),
      internalSample: [...new Set(internalSample)].slice(0, 40),
    },
    tech: { platforms, stackByCategory },
    meta: { canonical, robotsMeta, hasNoindex, viewportPresent, openGraphTitlePresent },
    images: { total: totalImg, withAlt },
    forms: {
      present: forms.length > 0,
      primaryFieldCount: fieldCount,
      primaryRequiredCount: requiredCount,
      primaryHasLabels: hasLabels,
    },
    blocks: {
      faqLike,
      testimonialLike,
      pricingMention,
      processLike,
    },
    heroPrimaryCtaCount: primaryCtasAboveFold,
    genericMarketingHero: GENERIC_MARKETING_RE.test(h1) || GENERIC_MARKETING_RE.test(title),
    machineReadableSurface,
  };
}

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

export function getHeroPrimaryCtaCount(facts: SnapshotFacts): number {
  return facts.heroPrimaryCtaCount ?? 0;
}

export function getGenericMarketingHero(facts: SnapshotFacts): boolean {
  return facts.genericMarketingHero ?? false;
}
