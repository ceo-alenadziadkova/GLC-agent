/**
 * Wappalyzer-style tech detection: multiple evidence channels (HTML, script[src], inline
 * scripts, meta tags, DOM probes, final URL) with OR-combination within a rule — modelled
 * after the community Webappalyzer / Wappalyzer fingerprint format (no runtime dependency).
 *
 * Pattern strings follow the same escaping idea as Wappalyzer (case-insensitive regex).
 * We do not implement confidence scoring or implies/requires graphs.
 */
import * as cheerio from 'cheerio';

import { WAPPALYZER_IMPORTED_RULES_RAW } from './wappalyzer-imported-rules.js';

export type TechDetectOpts = {
  /** Final URLs of fetched pages (for hostname-based rules like Netlify). */
  pageUrls?: string[];
};

export type TechCategory =
  | 'cms'
  | 'analytics'
  | 'frameworks'
  | 'hosting_cdn'
  | 'chat_support'
  | 'ecommerce'
  | 'email_marketing'
  | 'booking';

type CheerioRoot = ReturnType<typeof cheerio.load>;

export type TechRule = {
  category: TechCategory;
  name: string;
  html?: RegExp[];
  /** Match any external script URL */
  scriptSrc?: RegExp[];
  /** Inline <script> bodies (concatenated, capped) */
  scripts?: RegExp[];
  /** Meta name= or property= with content regex */
  meta?: Array<{ kind: 'name' | 'property'; key: string; pattern: RegExp }>;
  /**
   * DOM checks: exists = at least one node; attr+pattern = any node attribute matches.
   * Selectors use Cheerio (HTML is tolerant).
   */
  dom?: Array<{
    selector: string;
    exists?: boolean;
    attr?: string;
    pattern?: RegExp;
  }>;
  /** Full URL string (page + path) */
  url?: RegExp[];
  /**
   * Extra probes that need a live Cheerio tree (e.g. Cloudflare img vs cdnjs).
   */
  cheerioChecks?: Array<(root: CheerioRoot) => boolean>;
};

/** Strip Wappalyzer pattern tags: `pattern\\;confidence:50\\;version:\\1` -> regex source. */
export function wappalyzerPatternToRegExp(source: string): RegExp {
  const core = source.split(/\\;/)[0] ?? source;
  return new RegExp(core, 'i');
}

function safeWappalyzerPatternToRegExp(source: string): RegExp | null {
  try {
    return wappalyzerPatternToRegExp(source);
  } catch {
    return null;
  }
}

function mapRawPatternList(sources?: readonly string[]): RegExp[] | undefined {
  if (!sources?.length) return undefined;
  const out: RegExp[] = [];
  for (const s of sources) {
    const re = safeWappalyzerPatternToRegExp(s);
    if (re) out.push(re);
  }
  return out.length ? out : undefined;
}

/** Lazy compile of bulk Webappalyzer JSON import (invalid regex sources are skipped). */
let cachedImportedRules: TechRule[] | null = null;
function getWappalyzerImportedRulesCompiled(): TechRule[] {
  if (cachedImportedRules) return cachedImportedRules;
  const compiled: TechRule[] = [];
  for (const raw of WAPPALYZER_IMPORTED_RULES_RAW) {
    const metaIn = raw.meta;
    let meta: TechRule['meta'];
    if (metaIn?.length) {
      const rows: NonNullable<TechRule['meta']> = [];
      for (const m of metaIn) {
        const pattern = safeWappalyzerPatternToRegExp(m.pattern);
        if (pattern) rows.push({ kind: m.kind, key: m.key, pattern });
      }
      meta = rows.length ? rows : undefined;
    }
    const rule: TechRule = {
      category: raw.category,
      name: raw.name,
      html: mapRawPatternList(raw.html),
      scriptSrc: mapRawPatternList(raw.scriptSrc),
      scripts: mapRawPatternList(raw.scripts),
      url: mapRawPatternList(raw.url),
      meta,
    };
    if (
      rule.html?.length ||
      rule.scriptSrc?.length ||
      rule.scripts?.length ||
      rule.url?.length ||
      rule.meta?.length
    ) {
      compiled.push(rule);
    }
  }
  cachedImportedRules = compiled;
  return compiled;
}

export type TechChannels = {
  root: CheerioRoot;
  html: string;
  scriptSrcs: string[];
  inlineScripts: string;
  pageUrls: string[];
};

const MAX_INLINE_SCRIPT_CHARS = 400_000;

export function collectTechChannels(html: string, pageUrls: string[] = []): TechChannels {
  const root = cheerio.load(html);
  const scriptSrcs: string[] = [];
  root('script[src]').each((_, el) => {
    const u = root(el).attr('src');
    if (u) scriptSrcs.push(u);
  });
  let inline = '';
  root('script:not([src])').each((_, el) => {
    inline += `${root(el).text()}\n`;
  });
  if (inline.length > MAX_INLINE_SCRIPT_CHARS) {
    inline = inline.slice(0, MAX_INLINE_SCRIPT_CHARS);
  }
  return { root, html, scriptSrcs, inlineScripts: inline, pageUrls };
}

function ruleMatches(rule: TechRule, c: TechChannels): boolean {
  if (rule.cheerioChecks?.some(fn => fn(c.root))) return true;
  if (rule.html?.some(r => r.test(c.html))) return true;
  if (rule.scriptSrc?.some(r => c.scriptSrcs.some(u => r.test(u)))) return true;
  if (rule.scripts?.some(r => r.test(c.inlineScripts))) return true;
  if (rule.url?.length && c.pageUrls.some(u => rule.url!.some(r => r.test(u)))) return true;

  if (rule.meta?.length) {
    const metas: Array<{ name?: string; property?: string; content: string }> = [];
    c.root('meta').each((_, el) => {
      const name = c.root(el).attr('name');
      const property = c.root(el).attr('property');
      const content = c.root(el).attr('content') ?? '';
      metas.push({ name, property, content });
    });
    for (const m of rule.meta) {
      for (const row of metas) {
        if (m.kind === 'name' && row.name?.toLowerCase() === m.key.toLowerCase() && m.pattern.test(row.content)) {
          return true;
        }
        if (
          m.kind === 'property' &&
          row.property?.toLowerCase() === m.key.toLowerCase() &&
          m.pattern.test(row.content)
        ) {
          return true;
        }
      }
    }
  }

  if (rule.dom?.length) {
    for (const d of rule.dom) {
      const els = c.root(d.selector);
      if (d.exists && els.length > 0) return true;
      if (d.attr && d.pattern) {
        for (let i = 0; i < els.length; i++) {
          const v = c.root(els[i]).attr(d.attr);
          if (v && d.pattern.test(v)) return true;
        }
      }
    }
  }

  return false;
}

/**
 * High-signal manual rules (DOM / Cheerio probes). Additional fingerprints from
 * `wappalyzer-imported-rules.ts` (ingested from enthec/webappanalyzer) are merged in
 * `mergeTechDetections`. See: https://github.com/enthec/webappanalyzer
 */
export const WAPPALYZER_EXTRA_RULES: TechRule[] = [
  {
    category: 'cms',
    name: 'Magento',
    dom: [
      { selector: 'script[type="text/x-magento-init"]', exists: true },
      { selector: 'script[type=\'text/x-magento-init\']', exists: true },
      { selector: 'script[data-requiremodule*="mage/"]', exists: true },
      { selector: 'script[data-requiremodule*="Magento_"]', exists: true },
      { selector: 'html[data-image-optimizing-origin]', exists: true },
    ],
    scriptSrc: [
      wappalyzerPatternToRegExp('js/mage'),
      wappalyzerPatternToRegExp('static/_requirejs'),
      /\/static\/version\d+\//i,
    ],
  },
  {
    category: 'frameworks',
    name: 'Angular',
    dom: [{ selector: '[ng-version]', attr: 'ng-version', pattern: /^[\d.]+$/ }],
  },
  {
    category: 'frameworks',
    name: 'React',
    html: [wappalyzerPatternToRegExp('<[^>]+data-react')],
    dom: [
      { selector: '[data-reactroot]', exists: true },
      { selector: 'div[id*="react-root"]', exists: true },
      { selector: 'div[id*="appReactRoot"]', exists: true },
    ],
    scriptSrc: [
      wappalyzerPatternToRegExp('react(?:-with-addons)?[.-](\\d+(?:\\.\\d)+)[^/]*\\.js'),
      wappalyzerPatternToRegExp('/([\\d\\.]+)/react(?:\\.min)?\\.js'),
      /^react\b.*\.js/i,
    ],
    scripts: [wappalyzerPatternToRegExp('react\\.js')],
  },
  {
    category: 'hosting_cdn',
    name: 'Cloudflare',
    cheerioChecks: [
      root => {
        let hit = false;
        root('img[src]').each((_, el) => {
          const s = root(el).attr('src') ?? '';
          if (s.includes('cdn.cloudflare.com') && !s.includes('cdnjs.cloudflare.com')) hit = true;
        });
        return hit;
      },
      root =>
        root('meta[content*="cdn.cloudflare"]').toArray().some(el => {
          const c = root(el).attr('content') ?? '';
          return c.includes('cdn.cloudflare') && !c.includes('cdnjs.cloudflare');
        }),
    ],
  },
  {
    category: 'hosting_cdn',
    name: 'Netlify',
    url: [wappalyzerPatternToRegExp('^https?://[^/]+\\.netlify\\.(?:com|app)/')],
    scriptSrc: [wappalyzerPatternToRegExp('cdn\\.netlify\\.com')],
    cheerioChecks: [
      root => root('script[src*="netlify-identity"], script[src*="identity.netlify"]').length > 0,
    ],
  },
  {
    category: 'hosting_cdn',
    name: 'GitHub Pages',
    url: [/^https?:\/\/[^/]+\.github\.io\//i],
  },
  {
    category: 'hosting_cdn',
    name: 'Vercel',
    url: [/^https?:\/\/[^/]+\.vercel\.app\//i],
  },
];

export function mergeTechDetections(
  html: string,
  patterns: Record<string, Record<string, RegExp[]>>,
  into: Record<string, Set<string>>,
  opts?: TechDetectOpts,
): void {
  const pageUrls = opts?.pageUrls?.filter(Boolean) ?? [];
  const c = collectTechChannels(html, pageUrls);

  const rules: TechRule[] = [...WAPPALYZER_EXTRA_RULES, ...getWappalyzerImportedRulesCompiled()];
  for (const [category, techs] of Object.entries(patterns)) {
    for (const [name, regexes] of Object.entries(techs)) {
      rules.push({ category: category as TechCategory, name, html: regexes });
    }
  }

  for (const rule of rules) {
    if (!into[rule.category]) into[rule.category] = new Set();
    if (ruleMatches(rule, c)) into[rule.category]!.add(rule.name);
  }
}
