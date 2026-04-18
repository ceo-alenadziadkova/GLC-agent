import * as cheerio from 'cheerio';
import type { CrawledPage } from '../../types/audit.js';
import { extractJsonLdTypes } from '../../lib/site-html-signals.js';
import { SNAPSHOT_EXTRACTION_LIMITS } from '../config/snapshot-runtime.js';

export function buildMinimalPage(url: string): CrawledPage[] {
  return [
    {
      url,
      title: '',
      status: 0,
      meta_description: null,
      h1: [],
      h2: [],
      structured_data: [],
      images: { total: 0, with_alt: 0, missing_alt: 0, lazy_loaded: 0 },
      links: { internal: [], external: [] },
      content_length: 0,
      load_time_ms: 0,
    },
  ];
}

export function buildCrawledPages(
  urls: string[],
  htmlByUrl: Map<string, string>,
  baseUrl: string,
): CrawledPage[] {
  const out: CrawledPage[] = [];
  for (const url of urls) {
    const html = htmlByUrl.get(url);
    if (!html) continue;
    const $ = cheerio.load(html);
    const internal: string[] = [];
    const external: string[] = [];
    const base = new URL(url);
    $('a[href]').each((_, a) => {
      const href = $(a).attr('href');
      if (!href || href.startsWith('#')) return;
      try {
        const linkUrl = new URL(href, url);
        if (linkUrl.hostname === base.hostname) internal.push(linkUrl.href);
        else external.push(linkUrl.href);
      } catch {
        /* skip */
      }
    });
    const structured_data = extractJsonLdTypes(html);
    const images = $('img');
    let withAlt = 0;
    let missingAlt = 0;
    images.each((_, img) => {
      if ($(img).attr('alt')?.trim()) withAlt++;
      else missingAlt++;
    });
    out.push({
      url,
      title: $('title').text().trim() || '',
      status: 200,
      meta_description: $('meta[name="description"]').attr('content')?.trim() || null,
      h1: $('h1')
        .map((_, el) => $(el).text().trim())
        .get(),
      h2: $('h2')
        .map((_, el) => $(el).text().trim())
        .get(),
      structured_data: [...new Set(structured_data)],
      images: { total: images.length, with_alt: withAlt, missing_alt: missingAlt, lazy_loaded: 0 },
      links: {
        internal: [...new Set(internal)],
        external: [...new Set(external)].slice(0, SNAPSHOT_EXTRACTION_LIMITS.externalLinksMax),
      },
      content_length: html.length,
      load_time_ms: 0,
    });
  }
  return out.length > 0 ? out : buildMinimalPage(baseUrl);
}
