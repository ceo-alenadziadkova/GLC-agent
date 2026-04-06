/**
 * Shared HTML-derived signals for crawler, snapshot scanner, and classification.
 * Single source for tech fingerprints and JSON-LD type extraction.
 */

import * as cheerio from 'cheerio';

/** Tech stack detection patterns (categories → product → regexes). */
export const TECH_PATTERNS: Record<string, Record<string, RegExp[]>> = {
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

/**
 * Merge tech detections into category sets (mutates `into`).
 */
export function addTechStackFromHtml(html: string, into: Record<string, Set<string>>): void {
  for (const [category, techs] of Object.entries(TECH_PATTERNS)) {
    if (!into[category]) into[category] = new Set();
    for (const [name, patterns] of Object.entries(techs)) {
      for (const pattern of patterns) {
        if (pattern.test(html)) {
          into[category]!.add(name);
          break;
        }
      }
    }
  }
}

/**
 * Flat list of detected product names across all categories (for classification signals).
 */
export function listDetectedTechPlatforms(html: string): string[] {
  const into: Record<string, Set<string>> = {};
  addTechStackFromHtml(html, into);
  const out = new Set<string>();
  for (const s of Object.values(into)) {
    for (const name of s) out.add(name);
  }
  return [...out];
}

/**
 * Same shape as crawler output `tech_stack`.
 */
export function detectTechStackRecord(html: string): Record<string, string[]> {
  const into: Record<string, Set<string>> = {};
  for (const cat of Object.keys(TECH_PATTERNS)) {
    into[cat] = new Set();
  }
  addTechStackFromHtml(html, into);
  const result: Record<string, string[]> = {};
  for (const [cat, set] of Object.entries(into)) {
    result[cat] = [...set];
  }
  return result;
}

function collectJsonLdTypes(node: unknown, acc: Set<string>): void {
  if (node === null || node === undefined) return;
  if (typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdTypes(item, acc);
    return;
  }
  const o = node as Record<string, unknown>;
  const t = o['@type'];
  if (typeof t === 'string') acc.add(t);
  else if (Array.isArray(t)) {
    for (const x of t) {
      if (typeof x === 'string') acc.add(x);
    }
  }
  for (const v of Object.values(o)) {
    collectJsonLdTypes(v, acc);
  }
}

/**
 * All @type values from application/ld+json scripts (recursive).
 */
export function extractJsonLdTypes(html: string): string[] {
  const acc = new Set<string>();
  const $ = cheerio.load(html);
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).text());
      collectJsonLdTypes(json, acc);
    } catch {
      /* ignore */
    }
  });
  return [...acc];
}
