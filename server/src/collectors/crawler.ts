import * as cheerio from 'cheerio';
import { auditSkipsPublicWebsiteFetches } from '@glc/intake-core';
import { BaseCollector, type CollectorCollectContext } from './base.js';
import { PublicUrlNotAllowedError, fetchPublicHttpUrl, validatePublicAuditUrl } from '../lib/public-http-url.js';
import { detectLanguagesFromPages, extractLanguagesFromHtml } from '../lib/language-utils.js';
import { logger } from '../services/logger.js';
import { CRAWLER_USER_AGENT } from '../config/bot-identity.js';
import { COLLECTOR_CRAWLER_CONTACT_FIELD_MAX } from '../config/collector-sampling-limits.js';
import {
  CRAWLER_MAX_PAGES,
  CRAWLER_PAGE_TIMEOUT_MS,
  CRAWLER_TOTAL_BUDGET_MS,
} from '../config/crawler-limits.js';
import { SOCIAL_LINK_PATTERNS } from '../config/social-link-patterns.js';
import {
  CRAWLER_CONTACT_EMAIL_EXCLUDED_SUBSTRINGS,
  CRAWLER_CONTACT_EMAIL_PATTERN,
  CRAWLER_PHONE_MAX_DIGITS,
  CRAWLER_PHONE_MIN_DIGITS,
  crawlerContactPhoneDigitsLikelyYYYYMMDD,
  crawlerContactPhonePattern,
} from '../config/crawler-contact-extraction.js';
import { addTechStackFromHtml, TECH_PATTERNS } from '../lib/site-html-signals.js';

interface CrawledPage {
  url: string;
  title: string;
  status: number;
  meta_description: string | null;
  h1: string[];
  h2: string[];
  structured_data: string[];
  images: { total: number; with_alt: number; missing_alt: number; lazy_loaded: number };
  links: { internal: string[]; external: string[] };
  content_length: number;
  load_time_ms: number;
  html?: string; // Raw HTML for downstream collectors
  detected_languages?: string[];
}

export class CrawlerCollector extends BaseCollector {
  get key() { return 'crawler'; }
  get phase() { return 0; }

  async collect(auditId: string, companyUrl: string, ctx?: CollectorCollectContext) {
    if (auditSkipsPublicWebsiteFetches(ctx?.noPublicWebsite, companyUrl)) {
      const techStackResult: Record<string, string[]> = {};
      for (const cat of Object.keys(TECH_PATTERNS)) {
        techStackResult[cat] = [];
      }
      return {
        pages_crawled: [],
        tech_stack: techStackResult,
        social_profiles: {},
        contact_info: { emails: [], phones: [], addresses: [] },
        languages_detected: [],
        total_pages: 0,
        crawl_timestamp: new Date().toISOString(),
        no_public_website: true,
      };
    }

    let baseHref: string;
    try {
      baseHref = await validatePublicAuditUrl(companyUrl);
    } catch (e) {
      if (e instanceof PublicUrlNotAllowedError) {
        throw new Error(`Crawler: ${e.message}`);
      }
      throw e;
    }

    const visited = new Set<string>();
    const toVisit = [baseHref];
    const pages: CrawledPage[] = [];
    const techStack: Record<string, Set<string>> = {};
    const socialProfiles: Record<string, string> = {};
    const emails = new Set<string>();
    const phones = new Set<string>();

    // Initialize tech stack categories
    for (const cat of Object.keys(TECH_PATTERNS)) {
      techStack[cat] = new Set();
    }

    const baseUrl = new URL(baseHref);
    const crawlStart = Date.now();

    while (toVisit.length > 0 && pages.length < CRAWLER_MAX_PAGES) {
      if (Date.now() - crawlStart > CRAWLER_TOTAL_BUDGET_MS) {
        logger.warn('crawler.total_timeout', { component: 'crawler', pages_crawled: pages.length });
        break;
      }
      const url = toVisit.shift()!;
      const normalized = this.normalizeUrl(url);

      if (visited.has(normalized)) continue;
      visited.add(normalized);

      try {
        const page = await this.fetchPage(url);
        if (!page) continue;

        pages.push(page);

        // Detect tech stack from HTML
        const fullHtml = page.html ?? '';
        this.detectTechStack(fullHtml, techStack, url);

        // Detect social profiles
        this.detectSocials(fullHtml, socialProfiles);

        // Extract emails and phones
        this.extractContacts(fullHtml, emails, phones);

        // Queue internal links
        for (const link of page.links.internal) {
          try {
            const linkUrl = new URL(link, url);
            if (linkUrl.hostname === baseUrl.hostname && !visited.has(this.normalizeUrl(linkUrl.href))) {
              toVisit.push(linkUrl.href);
            }
          } catch {
            // Invalid URL, skip
          }
        }
      } catch (err) {
        logger.warn('crawler.fetch_failed', { component: 'crawler', url, error: (err as Error).message });
      }
    }

    // Detect languages from pages
    const languages = detectLanguagesFromPages(pages);

    // Clean pages (remove raw HTML to save space)
    const cleanPages = pages.map(({ html: _html, ...rest }) => rest);

    // Convert sets to arrays
    const techStackResult: Record<string, string[]> = {};
    for (const [cat, techs] of Object.entries(techStack)) {
      techStackResult[cat] = Array.from(techs);
    }

    return {
      pages_crawled: cleanPages,
      tech_stack: techStackResult,
      social_profiles: socialProfiles,
      contact_info: {
        emails: Array.from(emails).slice(0, COLLECTOR_CRAWLER_CONTACT_FIELD_MAX),
        phones: Array.from(phones).slice(0, COLLECTOR_CRAWLER_CONTACT_FIELD_MAX),
        addresses: [],
      },
      languages_detected: languages,
      total_pages: pages.length,
      crawl_timestamp: new Date().toISOString(),
    };
  }

  private async fetchPage(url: string): Promise<CrawledPage | null> {
    const start = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CRAWLER_PAGE_TIMEOUT_MS);

    try {
      const response = await fetchPublicHttpUrl(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': CRAWLER_USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en,es,ca',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status !== 404) return null;

      const html = await response.text();
      const loadTime = Date.now() - start;
      const $ = cheerio.load(html);

      // Extract structured data types
      const structuredData: string[] = [];
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const json = JSON.parse($(el).text());
          const type = json['@type'];
          if (type) structuredData.push(Array.isArray(type) ? type[0] : type);
        } catch { /* ignore malformed JSON-LD */ }
      });

      // Extract images info
      const images = $('img');
      const totalImages = images.length;
      let withAlt = 0, missingAlt = 0, lazyLoaded = 0;
      images.each((_, img) => {
        const el = $(img);
        if (el.attr('alt')?.trim()) withAlt++; else missingAlt++;
        if (el.attr('loading') === 'lazy' || el.attr('data-src')) lazyLoaded++;
      });

      // Extract links
      const internal: string[] = [];
      const external: string[] = [];
      $('a[href]').each((_, a) => {
        const href = $(a).attr('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
        try {
          const linkUrl = new URL(href, url);
          const baseUrl = new URL(url);
          if (linkUrl.hostname === baseUrl.hostname) {
            internal.push(linkUrl.href);
          } else {
            external.push(linkUrl.href);
          }
        } catch { /* skip invalid URLs */ }
      });

      return {
        url: response.url || url,
        title: $('title').text().trim() || '',
        status: response.status,
        meta_description: $('meta[name="description"]').attr('content')?.trim() || null,
        h1: $('h1').map((_, el) => $(el).text().trim()).get(),
        h2: $('h2').map((_, el) => $(el).text().trim()).get(),
        structured_data: [...new Set(structuredData)],
        images: { total: totalImages, with_alt: withAlt, missing_alt: missingAlt, lazy_loaded: lazyLoaded },
        links: { internal: [...new Set(internal)], external: [...new Set(external)] },
        content_length: html.length,
        load_time_ms: loadTime,
        html,
        detected_languages: extractLanguagesFromHtml(html),
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === 'AbortError') {
        logger.warn('crawler.page_timeout', { component: 'crawler', url });
      }
      return null;
    }
  }

  private detectTechStack(html: string, techStack: Record<string, Set<string>>, pageUrl?: string) {
    addTechStackFromHtml(html, techStack, pageUrl ? { pageUrls: [pageUrl] } : undefined);
  }

  private detectSocials(html: string, profiles: Record<string, string>) {
    for (const [platform, pattern] of Object.entries(SOCIAL_LINK_PATTERNS)) {
      if (profiles[platform]) continue;
      const match = html.match(pattern);
      if (match?.[1]) {
        profiles[platform] = match[1];
      }
    }
  }

  private extractContacts(html: string, emails: Set<string>, phones: Set<string>) {
    const emailRe = new RegExp(CRAWLER_CONTACT_EMAIL_PATTERN.source, CRAWLER_CONTACT_EMAIL_PATTERN.flags);
    const foundEmails = html.match(emailRe);
    if (foundEmails) {
      for (const email of foundEmails) {
        const skip = CRAWLER_CONTACT_EMAIL_EXCLUDED_SUBSTRINGS.some((s) => email.includes(s));
        if (!skip) emails.add(email.toLowerCase());
      }
    }

    const phonePattern = crawlerContactPhonePattern();
    const foundPhones = html.match(phonePattern);
    if (foundPhones) {
      for (const phone of foundPhones) {
        const cleaned = phone.replace(/[^\d+]/g, '');
        if (crawlerContactPhoneDigitsLikelyYYYYMMDD(cleaned)) continue;
        if (cleaned.length >= CRAWLER_PHONE_MIN_DIGITS && cleaned.length <= CRAWLER_PHONE_MAX_DIGITS) {
          phones.add(cleaned);
        }
      }
    }
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      return `${u.origin}${u.pathname.replace(/\/$/, '')}`;
    } catch {
      return url;
    }
  }
}
