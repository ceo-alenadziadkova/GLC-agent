import type * as cheerio from 'cheerio';
import { FACT_EXTRACTION_POLICY } from '../config/fact-extraction-policy.js';
import { FACT_EXTRACTION_REGEX } from '../config/fact-patterns.js';

export type PageSignals = {
  faqLike: boolean;
  testimonialLike: boolean;
  pricingMention: boolean;
  processLike: boolean;
  ctaTexts: string[];
  navItems: string[];
};

export function extractPageSignals($: cheerio.CheerioAPI): PageSignals {
  const faqLike =
    $("[id*='faq' i], [class*='faq' i], [data-section*='faq' i]").length > 0 ||
    $('details').length >= 2;
  const testimonialLike =
    $("[class*='testimonial' i], [id*='testimonial' i], blockquote").length > 0;
  const body = $.root().text().toLowerCase();
  const pricingMention = FACT_EXTRACTION_REGEX.pricing.test(body);
  const processLike =
    $("[class*='process' i], [class*='how it works' i], [id*='steps' i]").length > 0 ||
    FACT_EXTRACTION_REGEX.process.test(body);

  const ctaTexts: string[] = [];
  $('a, button').each((_, el) => {
    const t = $(el).text().trim();
    if (
      t.length > FACT_EXTRACTION_POLICY.limits.ctaTextMinLen &&
      t.length < FACT_EXTRACTION_POLICY.limits.ctaTextMaxLen &&
      FACT_EXTRACTION_REGEX.ctaVerb.test(t)
    ) {
      ctaTexts.push(t);
    }
  });

  const navItems: string[] = [];
  $('header nav a, nav a, [role="navigation"] a').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 0 && t.length < FACT_EXTRACTION_POLICY.limits.navItemMaxLen) {
      navItems.push(t);
    }
  });

  return { faqLike, testimonialLike, pricingMention, processLike, ctaTexts, navItems };
}
