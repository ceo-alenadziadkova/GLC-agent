/**
 * Shared HTML-derived signals for crawler, snapshot scanner, and classification.
 * Single source for tech fingerprints and JSON-LD type extraction.
 */

import * as cheerio from 'cheerio';
import { mergeTechDetections, type TechDetectOpts } from './tech-wappalyzer-detect.js';

export type { TechDetectOpts } from './tech-wappalyzer-detect.js';

/** Tech stack detection patterns (categories → product → regexes). */
export const TECH_PATTERNS: Record<string, Record<string, RegExp[]>> = {
  cms: {
    WordPress: [/wp-content/i, /wp-includes/i],
    /** Avoid `mage/` noise and stray "Magento" in prose; require storefront markers. */
    Magento: [
      /type\s*=\s*["']text\/x-magento-init["']/i,
      /\bMage\.(Cookies|require|translate)\b/i,
      /["']Magento_[A-Za-z0-9/]+["']/i,
      /\/static\/version\d+\/[^"']*\/Magento_/i,
    ],
    Shopify: [/cdn\.shopify\.com/i, /shopify/i],
    Wix: [/wix\.com/i, /wixstatic/i],
    Squarespace: [/squarespace\.com/i, /sqsp/i],
    Webflow: [/webflow\.com/i],
    Ghost: [/ghost\.io/i, /ghost\.org/i],
    Drupal: [/\/sites\/default\/files/i, /\bDrupal\.settings\b/i, /drupal\.js/i, /\/core\/misc\/drupal/i],
    Joomla: [/\/media\/jui\//i, /\/components\/com_joomla/i, /\/administrator\/components\/com_[a-z]+/i],
    BigCommerce: [/bigcommerce\.com/i, /\.mybigcommerce\.com/i, /bigcommerce\.cloud/i],
    PrestaShop: [/prestashop/i, /modules\/prestashop/i],
    Contentful: [/contentful\.com/i, /ctfassets\.net/i],
    Sanity: [/sanity\.io/i, /@sanity\//i],
    Strapi: [/strapi\.io/i, /\/uploads\/.*strapi/i],
    'Craft CMS': [/craftcms\.com/i, /\bcraft\.cms\b/i, /\/cpresources\//i],
    TYPO3: [/\/typo3conf\//i, /\/typo3temp\//i, /\/typo3\/sysext/i],
  },
  analytics: {
    'Google Analytics 4': [/gtag.*G-/i, /googletagmanager/i, /google-analytics/i],
    'Google Tag Manager': [/\/gtm\.js|googletagmanager\.com\/gtm\.js/i],
    'Meta Pixel': [/fbq\(|facebook\.net\/tr/i],
    Hotjar: [/hotjar\.com/i],
    Plausible: [/plausible\.io/i],
    Matomo: [/matomo|piwik/i],
    'Microsoft Clarity': [/clarity\.ms/i, /scripts\.clarity\.ms/i],
    Segment: [/cdn\.segment\.com/i, /api\.segment\.io/i],
    Mixpanel: [/cdn\.mxpnl\.com/i, /mixpanel\.com/i],
    PostHog: [/posthog\.com/i, /app\.posthog\.com/i, /\bph_project_api_key\b/i],
    Amplitude: [/cdn\.amplitude\.com/i, /api\.amplitude\.com/i],
    Heap: [/heap-analytics\.com/i, /heapanalytics\.com/i],
    Fathom: [/cdn\.usefathom\.com/i, /script\.fathom\.pro/i],
    'Adobe Analytics': [/adobedtm\.com/i, /demdex\.net/i, /\bmbox\.(?:min\.)?js\b/i, /\bAppMeasurement\.(?:min\.)?js\b/i],
    Sentry: [/browser\.sentry-cdn\.com/i, /@sentry\/|sentry\.io\/api/i],
  },
  frameworks: {
    /** Avoid matching the word "react" in prose; prefer bundles, Next, and typical bootstrap snippets. */
    React: [
      /react-dom|react\.production|react\.development/i,
      /__NEXT_DATA__|__next\/static/i,
      /\breact\b.*\/(?:node_modules\/)?react\//i,
      /createRoot\s*\(\s*document\.getElementById/i,
      /hydrateRoot\s*\(/i,
      /\bdata-reactroot\b|__reactContainer|react\.jsx/i,
      /<link[^>]*rel=["'](?:modulepreload|preload)["'][^>]*href=["'][^"']*react-d/i,
    ],
    /** Drop bare `v-if` (matches non-Vue HTML); keep Vue-specific tokens. */
    Vue: [/vue(?:\.min)?\.js/i, /vuejs/i, /@vue\//i, /\bv-cloak\b/i, /__VUE__/i],
    /** Avoid generic `ng-` prefixes in arbitrary CSS/class names. */
    Angular: [
      /ng-version\s*=\s*["']/i,
      /@angular\/(core|common|platform-browser)/i,
      /\bangular\.module\s*\(/i,
      /\bplatformBrowserDynamic\b/i,
      /\bbootstrapApplication\s*\(/i,
      /\bng-app\s*=/i,
    ],
    Svelte: [/svelte/i],
    Next: [/_next\//i, /next\.js/i],
    Nuxt: [/_nuxt\//i, /nuxt/i],
    Gatsby: [/gatsby/i],
    Astro: [/astro/i],
    /** Build-tool hints in served HTML (Vite, Tailwind). */
    Vite: [/\/@vite\/|@vitejs\/|vite\.svg/i, /\bimport\.meta\.env\b/i],
    Tailwind: [/tailwindcss/i, /@tailwind\s/],
    Remix: [/@remix-run|__remixContext|remix\.run/i],
    Preact: [/preact(?:\.min)?\.js/i, /\/preact\//i, /@preact\//i],
    jQuery: [/jquery(?:[\.-]migrate)?(?:\.min)?\.js/i, /\/jquery\/\d/i, /code\.jquery\.com\/jquery/i],
    'Alpine.js': [/alpinejs|@alpinejs|Alpine\.data|x-data=/i],
    HTMX: [/htmx\.org|\/htmx(?:\.min)?\.js/i],
    SolidJS: [/solid-js|solid\.js|__SOLID__/i],
    Qwik: [/\bqwik\b|builder\.io\/qwik|qwik\.dev/i],
    Livewire: [/livewire\.js|@livewire/i, /wire:init|wire:model/i],
    Elm: [/elm\.js|Elm\.Main|__elm/i],
    Stimulus: [/stimulus\.min\.js|@hotwired\/stimulus/i],
    Turbo: [/@hotwired\/turbo|turbo\.min\.js|data-turbo/i],
  },
  hosting_cdn: {
    /**
     * Do not treat cdnjs.cloudflare.com as "using Cloudflare" — that is only a public library CDN.
     * Prefer proxy / WAF / Turnstile / beacon endpoints actually tied to CF fronting the property.
     */
    Cloudflare: [
      /challenges\.cloudflare\.com/i,
      /cloudflareinsights\.com/i,
      /__cf_bm|cf-turnstile/i,
      /cdn-cgi\/(?:challenge|scripts\/)/i,
      /static\.cloudflareinsights\.com/i,
    ],
    Vercel: [/vercel/i, /\.vercel\.app/i],
    Netlify: [
      /\bnetlify\.(com|app)\b/i,
      /--[a-z0-9-]+\.netlify\.app\b/i,
      /identity\.netlify\.com/i,
      /__NETLIFY|netlifyIdentity|data-netlify/i,
    ],
    AWS: [/amazonaws\.com/i, /cloudfront/i],
    /** Firebase / Cloud Run / Functions / classic App Engine — not every gstatic font load. */
    'Google Cloud': [
      /\.run\.app\b/i,
      /cloudfunctions\.net/i,
      /\b[a-z0-9-]+\.appspot\.com\b/i,
      /firebase(?:app)?\.com|firebaseio\.com/i,
      /firebasestorage\.googleapis/i,
      /storage\.googleapis\.com/i,
    ],
    /** Very common; separate from GCP hosting. */
    'Google Fonts': [/fonts\.googleapis\.com/i, /fonts\.gstatic\.com/i],
    reCAPTCHA: [/google\.com\/recaptcha/i, /www\.gstatic\.com\/recaptcha/i],
    DigitalOcean: [/digitalocean/i],
    Fastly: [/fastly\.net/i, /fastly-insights\.com/i],
    Akamai: [/akamaihd\.net/i, /akamaized\.net/i, /edgekey\.net/i],
    Azure: [/azurewebsites\.net/i, /blob\.core\.windows\.net/i, /\.azureedge\.net/i],
    Supabase: [/supabase\.co/i, /supabase\.in/i],
    'Fly.io': [/\.fly\.dev\b/i],
    Render: [/onrender\.com/i],
    'Bunny CDN': [/b-cdn\.net/i, /bunnycdn\.com/i],
    KeyCDN: [/kxcdn\.com/i],
    imgix: [/imgix\.net/i, /iximg\.net/i],
    Cloudinary: [/res\.cloudinary\.com/i, /cloudinary\.com\/image/i],
  },
  chat_support: {
    'WhatsApp Widget': [/wa\.me|whatsapp/i],
    Intercom: [/intercom/i],
    Crisp: [/crisp\.chat/i],
    Drift: [/drift\.com/i],
    LiveChat: [/livechat/i],
    Tawk: [/tawk\.to/i],
    HubSpot: [/hubspot/i],
    Zendesk: [/zendesk\.com/i, /zdassets\.com/i],
    Freshdesk: [/freshdesk\.com/i],
    Tidio: [/tidio\.co/i, /tidiochat/i],
    Olark: [/olark\.com/i],
    'Help Scout': [/beacon-v2\.helpscout\.net/i, /helpscout\.net/i],
  },
  ecommerce: {
    Stripe: [/stripe\.com|js\.stripe/i],
    PayPal: [/paypal/i],
    WooCommerce: [/woocommerce/i],
    Snipcart: [/snipcart\.com/i],
    'Lemon Squeezy': [/lemonsqueezy\.com/i],
    Paddle: [/paddle\.com/i],
    Ecwid: [/ecwid\.com/i],
    'Big Cartel': [/bigcartel\.com/i],
    'Shop Pay': [/shop\.app\/pay/i, /shopifycs\.com/i],
  },
  email_marketing: {
    Mailchimp: [/mailchimp/i],
    SendGrid: [/sendgrid\.net/i, /api\.sendgrid\.com/i, /\bsendgrid\b.*\.js/i],
    ConvertKit: [/convertkit/i],
    Postmark: [/postmarkapp\.com/i],
    Braze: [/braze\.com/i],
    Iterable: [/js\.iterable\.com/i, /iterable\.com/i],
    'Customer.io': [/customer\.io/i],
    Drip: [/getdrip\.com/i],
    Klaviyo: [/klaviyo\.com/i],
  },
  booking: {
    Calendly: [/calendly\.com/i],
    'Cal.com': [/cal\.com\/embed/i, /app\.cal\.com/i],
    Acuity: [/acuityscheduling\.com/i],
    SimplyBook: [/simplybook\.(me|net)/i],
    YouCanBookMe: [/youcanbook\.me/i],
  },
};

/**
 * Merge tech detections into category sets (mutates `into`).
 * Uses Wappalyzer-style channels (script[src], meta, DOM, URL) plus legacy HTML regex buckets.
 */
export function addTechStackFromHtml(
  html: string,
  into: Record<string, Set<string>>,
  opts?: TechDetectOpts,
): void {
  mergeTechDetections(html, TECH_PATTERNS, into, opts);
}

/**
 * Flat list of detected product names across all categories (for classification signals).
 */
export function listDetectedTechPlatforms(html: string, opts?: TechDetectOpts): string[] {
  const into: Record<string, Set<string>> = {};
  addTechStackFromHtml(html, into, opts);
  const out = new Set<string>();
  for (const s of Object.values(into)) {
    for (const name of s) out.add(name);
  }
  return [...out];
}

/**
 * Same shape as crawler output `tech_stack`.
 */
export function detectTechStackRecord(html: string, opts?: TechDetectOpts): Record<string, string[]> {
  const into: Record<string, Set<string>> = {};
  for (const cat of Object.keys(TECH_PATTERNS)) {
    into[cat] = new Set();
  }
  addTechStackFromHtml(html, into, opts);
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
