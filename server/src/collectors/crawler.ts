import * as cheerio from 'cheerio';
import { BaseCollector } from './base.js';

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
}

// Tech stack detection patterns
const TECH_PATTERNS: Record<string, Record<string, RegExp[]>> = {
  cms: {
    WordPress: [/wp-content/i, /wp-includes/i],
    Magento: [/mage\/|magento/i, /Magento/],
    Shopify: [/cdn\.shopify\.com/i, /shopify/i],
    Wix: [/wix\.com/i, /wixstatic/i],
    Squarespace: [/squarespace\.com/i, /sqsp/i],
    Webflow: [/webflow\.com/i],
    Ghost: [/ghost\.io/i, /ghost\.org/i],
  },
  analytics: {
    'Google Analytics 4': [/gtag.*G-/i, /googletagmanager/i, /google-analytics/i],
    'Meta Pixel': [/fbq\(|facebook\.net\/tr/i],
    Hotjar: [/hotjar\.com/i],
    Plausible: [/plausible\.io/i],
    Matomo: [/matomo|piwik/i],
  },
  frameworks: {
    React: [/react|__next/i, /_next\/static/i],
    Vue: [/vue\.js|vuejs/i, /v-cloak|v-if/],
    Angular: [/angular|ng-/i],
    Svelte: [/svelte/i],
    Next: [/_next\//i, /next\.js/i],
    Nuxt: [/_nuxt\//i, /nuxt/i],
    Gatsby: [/gatsby/i],
    Astro: [/astro/i],
  },
  hosting_cdn: {
    Cloudflare: [/cloudflare/i, /cf-ray/i],
    Vercel: [/vercel/i, /\.vercel\.app/i],
    Netlify: [/netlify/i],
    AWS: [/amazonaws\.com/i, /cloudfront/i],
    'Google Cloud': [/googleapis\.com|gstatic/i],
    DigitalOcean: [/digitalocean/i],
  },
  chat_support: {
    'WhatsApp Widget': [/wa\.me|whatsapp/i],
    Intercom: [/intercom/i],
    Crisp: [/crisp\.chat/i],
    Drift: [/drift\.com/i],
    LiveChat: [/livechat/i],
    Tawk: [/tawk\.to/i],
    HubSpot: [/hubspot/i],
  },
  ecommerce: {
    Stripe: [/stripe\.com|js\.stripe/i],
    PayPal: [/paypal/i],
    WooCommerce: [/woocommerce/i],
  },
  email_marketing: {
    Mailchimp: [/mailchimp/i],
    SendGrid: [/sendgrid/i],
    ConvertKit: [/convertkit/i],
  },
};

const SOCIAL_PATTERNS: Record<string, RegExp> = {
  twitter: /(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/,
  linkedin: /linkedin\.com\/(?:company|in)\/([a-zA-Z0-9_-]+)/,
  facebook: /facebook\.com\/([a-zA-Z0-9._-]+)/,
  instagram: /instagram\.com\/([a-zA-Z0-9._-]+)/,
  youtube: /youtube\.com\/(?:@|channel\/)([a-zA-Z0-9_-]+)/,
  github: /github\.com\/([a-zA-Z0-9_-]+)/,
};

export class CrawlerCollector extends BaseCollector {
  get key() { return 'crawler'; }
  get phase() { return 0; }

  private maxPages = 20;
  private timeout = 15_000;

  async collect(auditId: string, companyUrl: string) {
    const visited = new Set<string>();
    const toVisit = [companyUrl];
    const pages: CrawledPage[] = [];
    const techStack: Record<string, Set<string>> = {};
    const socialProfiles: Record<string, string> = {};
    const emails = new Set<string>();
    const phones = new Set<string>();

    // Initialize tech stack categories
    for (const cat of Object.keys(TECH_PATTERNS)) {
      techStack[cat] = new Set();
    }

    const baseUrl = new URL(companyUrl);
    const TOTAL_TIMEOUT_MS = 90_000;
    const crawlStart = Date.now();

    while (toVisit.length > 0 && pages.length < this.maxPages) {
      if (Date.now() - crawlStart > TOTAL_TIMEOUT_MS) {
        console.warn(`[Crawler] Total timeout reached after ${pages.length} pages — stopping crawl`);
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
        this.detectTechStack(fullHtml, techStack);

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
        console.warn(`[Crawler] Failed to fetch ${url}:`, (err as Error).message);
      }
    }

    // Detect languages from pages
    const languages = this.detectLanguages(pages);

    // Clean pages (remove raw HTML to save space)
    const cleanPages = pages.map(({ html, ...rest }) => rest);

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
        emails: Array.from(emails).slice(0, 10),
        phones: Array.from(phones).slice(0, 10),
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
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'GLC-AuditBot/1.0 (+https://glctech.es)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en,es,ca',
        },
        redirect: 'follow',
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
        url,
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
      };
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === 'AbortError') {
        console.warn(`[Crawler] Timeout fetching ${url}`);
      }
      return null;
    }
  }

  private detectTechStack(html: string, techStack: Record<string, Set<string>>) {
    for (const [category, techs] of Object.entries(TECH_PATTERNS)) {
      for (const [name, patterns] of Object.entries(techs)) {
        for (const pattern of patterns) {
          if (pattern.test(html)) {
            techStack[category]?.add(name);
            break;
          }
        }
      }
    }
  }

  private detectSocials(html: string, profiles: Record<string, string>) {
    for (const [platform, pattern] of Object.entries(SOCIAL_PATTERNS)) {
      if (profiles[platform]) continue;
      const match = html.match(pattern);
      if (match?.[1]) {
        profiles[platform] = match[1];
      }
    }
  }

  private extractContacts(html: string, emails: Set<string>, phones: Set<string>) {
    // Emails
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const foundEmails = html.match(emailPattern);
    if (foundEmails) {
      for (const email of foundEmails) {
        if (!email.includes('example.com') && !email.includes('sentry')) {
          emails.add(email.toLowerCase());
        }
      }
    }

    // Phones (basic extraction)
    const phonePattern = /(?:tel:|phone:|whatsapp:)?\+?[\d\s()-]{7,}/g;
    const foundPhones = html.match(phonePattern);
    if (foundPhones) {
      for (const phone of foundPhones) {
        const cleaned = phone.replace(/[^\d+]/g, '');
        if (cleaned.length >= 7 && cleaned.length <= 15) {
          phones.add(cleaned);
        }
      }
    }
  }

  private detectLanguages(pages: CrawledPage[]): string[] {
    const langs = new Set<string>();

    for (const page of pages) {
      const html = page.html ?? '';
      // Check html lang attribute
      const langMatch = html.match(/<html[^>]*\slang=["']([a-z]{2})(?:-[A-Z]{2})?["']/i);
      if (langMatch) langs.add(langMatch[1].toLowerCase());

      // Check hreflang tags
      const hreflangPattern = /hreflang=["']([a-z]{2})(?:-[A-Z]{2})?["']/gi;
      let match;
      while ((match = hreflangPattern.exec(html)) !== null) {
        langs.add(match[1].toLowerCase());
      }
    }

    return Array.from(langs);
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
