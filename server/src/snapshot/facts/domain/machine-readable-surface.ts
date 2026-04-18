import * as cheerio from 'cheerio';
import type { FetchedPage } from '../../types.js';
import { FACT_EXTRACTION_REGEX } from '../config/fact-patterns.js';

export function detectMachineReadableSurface(pages: FetchedPage[]): {
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
      if (lower.includes('llms.txt') || FACT_EXTRACTION_REGEX.aiTxtLink.test(href)) {
        llmsOrAiTxtLinked = true;
      }
      if (FACT_EXTRACTION_REGEX.sitemapFile.test(href) || FACT_EXTRACTION_REGEX.sitemapIndex.test(lower)) {
        sitemapLinkInHtml = true;
      }
    });
    if (FACT_EXTRACTION_REGEX.sitemapRelInRawHtml.test(p.html)) sitemapLinkInHtml = true;
    if (FACT_EXTRACTION_REGEX.llmsHrefInRawHtml.test(p.html)) llmsOrAiTxtLinked = true;
    if (FACT_EXTRACTION_REGEX.aiTxtHrefInRawHtml.test(p.html)) llmsOrAiTxtLinked = true;
  }
  return { sitemapLinkInHtml, llmsOrAiTxtLinked };
}
